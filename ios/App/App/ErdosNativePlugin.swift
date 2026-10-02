import Capacitor
import UIKit
import UniformTypeIdentifiers

/* Native bridge for the iPhone shell: WKWebView browser, Blok rules,
   the placeholder detectors, and the on-device learning store. */
@objc(ErdosNativePlugin)
public class ErdosNativePlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "ErdosNativePlugin"
    public let jsName = "ErdosNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setBrowserFrame", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBrowserVisible", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadUrl", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "goBack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "goForward", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "browserState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBlokConfig", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getBlokState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "detectText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveFeedback", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "undoFeedback", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLearning", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setShareChoice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reviewShare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLearning", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listDir", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createFolder", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deletePath", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickOpenPath", returnType: CAPPluginReturnPromise),
    ]

    private let browser = BlokBrowser()
    private let learning = BlokLearningStore()
    private let rules = BlokRules.loadBundled()
    private let scriptProxy = BlokScriptProxy()
    private var pickerCall: CAPPluginCall?
    private var installed = false

    override public func load() {
        scriptProxy.plugin = self
        browser.onNavigate = { [weak self] state in
            self?.notifyListeners("navigation", data: state)
        }
    }

    @objc func setBrowserFrame(_ call: CAPPluginCall) {
        let x = CGFloat(call.getDouble("x") ?? 0)
        let y = CGFloat(call.getDouble("y") ?? 0)
        let width = CGFloat(call.getDouble("width") ?? 0)
        let height = CGFloat(call.getDouble("height") ?? 0)
        DispatchQueue.main.async {
            self.installIfNeeded()
            let origin = self.bridge?.webView?.frame.origin ?? .zero
            self.browser.setFrame(CGRect(x: origin.x + x, y: origin.y + y, width: width, height: height))
            call.resolve()
        }
    }

    @objc func setBrowserVisible(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        DispatchQueue.main.async {
            self.installIfNeeded()
            self.browser.setVisible(visible)
            call.resolve()
        }
    }

    @objc func loadUrl(_ call: CAPPluginCall) {
        guard let url = call.getString("url"), !url.isEmpty else {
            call.reject("Missing url")
            return
        }
        DispatchQueue.main.async {
            self.installIfNeeded()
            self.browser.load(urlString: url)
            self.browser.setVisible(true)
            call.resolve(self.browser.state())
        }
    }

    @objc func goBack(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.browser.webView?.canGoBack == true { self.browser.webView?.goBack() }
            call.resolve(self.browser.state())
        }
    }

    @objc func goForward(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.browser.webView?.canGoForward == true { self.browser.webView?.goForward() }
            call.resolve(self.browser.state())
        }
    }

    @objc func reload(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.browser.webView?.reload()
            call.resolve()
        }
    }

    @objc func browserState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(self.browser.state())
        }
    }

    @objc func setBlokConfig(_ call: CAPPluginCall) {
        let next = self.config(from: call)
        learning.updateSettings([
            "visual": next["visual"] as Any,
            "textDetection": next["textDetection"] as Any,
            "textThreshold": next["textThreshold"] as Any,
            "minWords": next["minWords"] as Any,
        ])
        DispatchQueue.main.async {
            self.installIfNeeded()
            self.browser.update(config: next, rules: self.rules)
            call.resolve(next)
        }
    }

    @objc func getBlokState(_ call: CAPPluginCall) {
        call.resolve([
            "counts": learning.counts(),
            "settings": learning.settings(),
            "nativeBrowser": true,
        ])
    }

    @objc func detectText(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let result = BlokDetector.mockText(text)
        let hash = BlokDetector.hashText(text)
        call.resolve([
            "kind": "text",
            "confidence": result.confidence,
            "signals": result.signals,
            "hash": hash,
            "remembered": learning.verdict(for: hash) ?? "",
            "placeholder": true,
            "beta": true,
            "proprietary": true,
            "model": NSNull(),
            "label": "placeholder",
        ])
    }

    @objc func saveFeedback(_ call: CAPPluginCall) {
        var body: [String: Any] = [
            "id": call.getString("id") ?? "",
            "hash": call.getString("hash") ?? "",
            "kind": call.getString("kind") ?? "text",
            "verdict": call.getString("verdict") ?? "ai",
            "source": call.getString("source") ?? "buttons",
            "text": call.getString("text") ?? "",
            "mediaKey": call.getString("mediaKey") ?? "",
            "domain": call.getString("domain") ?? "",
            "manual": call.getBool("manual") ?? false,
            "sensitive": call.getBool("sensitive") ?? false,
        ]
        if let score = call.getDouble("score") { body["score"] = score }
        if let signals = call.getArray("signals", String.self) { body["signals"] = signals }
        let record = learning.makeRecord(from: body)
        learning.save(record)
        if (learning.settings()["shareChoice"] as? String) == "unset" {
            notifyListeners("sharePrompt", data: ["id": record["id"] ?? ""])
        }
        notifyListeners("learning", data: learning.snapshot())
        call.resolve(record)
    }

    @objc func undoFeedback(_ call: CAPPluginCall) {
        learning.undo(id: call.getString("id") ?? "")
        notifyListeners("learning", data: learning.snapshot())
        call.resolve(learning.snapshot())
    }

    @objc func getLearning(_ call: CAPPluginCall) {
        call.resolve(learning.snapshot())
    }

    @objc func setShareChoice(_ call: CAPPluginCall) {
        let choice = call.getString("choice") == "share" ? "share" : "local"
        let settings = learning.updateSettings([
            "shareChoice": choice,
            "shareFeedback": choice == "share",
        ])
        call.resolve(settings)
    }

    @objc func reviewShare(_ call: CAPPluginCall) {
        learning.review(id: call.getString("id") ?? "", approve: call.getBool("approve") ?? false)
        call.resolve(learning.snapshot())
    }

    @objc func clearLearning(_ call: CAPPluginCall) {
        learning.clear(scope: call.getString("scope") ?? "all")
        call.resolve(learning.snapshot())
    }

    @objc func listDir(_ call: CAPPluginCall) {
        do {
            let relative = call.getString("path") ?? ""
            let url = try resolve(relative, create: true)
            var isDir: ObjCBool = false
            FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)
            let target = isDir.boolValue ? url : try sandboxRoot()
            let names = try FileManager.default.contentsOfDirectory(at: target, includingPropertiesForKeys: [.isDirectoryKey])
            let entries: [[String: Any]] = names.map { item in
                let dir = (try? item.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
                return ["name": item.lastPathComponent, "isDirectory": dir]
            }.sorted { left, right in
                let ld = left["isDirectory"] as? Bool ?? false
                let rd = right["isDirectory"] as? Bool ?? false
                if ld != rd { return ld && !rd }
                return (left["name"] as? String ?? "") < (right["name"] as? String ?? "")
            }
            call.resolve(["path": relative, "entries": entries])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func readFile(_ call: CAPPluginCall) {
        do {
            let url = try resolve(call.getString("path") ?? "", create: false)
            let text = try String(contentsOf: url, encoding: .utf8)
            call.resolve(["path": call.getString("path") ?? "", "text": text])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func writeFile(_ call: CAPPluginCall) {
        do {
            let relative = call.getString("path") ?? ""
            let url = try resolve(relative, create: true)
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try (call.getString("content") ?? "").write(to: url, atomically: true, encoding: .utf8)
            try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
            call.resolve(["path": relative])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func createFolder(_ call: CAPPluginCall) {
        do {
            let url = try resolve(call.getString("path") ?? "", create: true)
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
            call.resolve(["path": call.getString("path") ?? ""])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func deletePath(_ call: CAPPluginCall) {
        do {
            let url = try resolve(call.getString("path") ?? "", create: false)
            if FileManager.default.fileExists(atPath: url.path) {
                try FileManager.default.removeItem(at: url)
            }
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func pickOpenPath(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.bridge?.saveCall(call)
            self.pickerCall = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.plainText, UTType.text, UTType.json], asCopy: true)
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pickerCall else { return }
        pickerCall = nil
        guard let url = urls.first else {
            call.reject("No file selected")
            bridge?.releaseCall(call)
            return
        }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let text = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
        call.resolve(["name": url.lastPathComponent, "text": text])
        bridge?.releaseCall(call)
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickerCall?.reject("Cancelled")
        if let call = pickerCall { bridge?.releaseCall(call) }
        pickerCall = nil
    }

    func handleBlokMessage(_ message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "detect-text":
            let text = body["text"] as? String ?? ""
            let result = BlokDetector.mockText(text)
            let hash = BlokDetector.hashText(text)
            let payload: [String: Any] = [
                "source": "erdos-blok-host",
                "type": "detect-result",
                "id": body["id"] ?? "",
                "confidence": result.confidence,
                "hash": hash,
                "remembered": learning.verdict(for: hash) ?? "",
                "signals": result.signals,
                "placeholder": true,
            ]
            reply(payload)
        case "feedback":
            let record = learning.makeRecord(from: body)
            learning.save(record)
            if (learning.settings()["shareChoice"] as? String) == "unset" {
                notifyListeners("sharePrompt", data: ["id": record["id"] ?? ""])
            }
            notifyListeners("learning", data: learning.snapshot())
        case "undo":
            learning.undo(id: body["id"] as? String ?? "")
            notifyListeners("learning", data: learning.snapshot())
        case "hid":
            let counts = learning.bump(body["kind"] as? String ?? "")
            notifyListeners("counts", data: counts)
        default:
            break
        }
    }

    private func reply(_ payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async {
            self.browser.webView?.evaluateJavaScript("window.__blokOnDetect && window.__blokOnDetect(\(json));", completionHandler: nil)
        }
    }

    private func installIfNeeded() {
        guard let host = bridge?.webView?.superview else { return }
        browser.attach(handler: scriptProxy, host: host)
        if !installed {
            installed = true
            browser.update(config: config(from: nil), rules: rules)
        }
    }

    private func config(from call: CAPPluginCall?) -> [String: Any] {
        let settings = learning.settings()
        let disabledAds = call?.getArray("disabledAds", String.self) ?? []
        let disabledAi = call?.getArray("disabledAi", String.self) ?? []
        return [
            "ads": true,
            "ai": true,
            "visual": call?.getBool("visual") ?? (settings["visual"] as? Bool ?? true),
            "textDetection": call?.getBool("textDetection") ?? (settings["textDetection"] as? Bool ?? true),
            "textThreshold": call?.getDouble("textThreshold") ?? (settings["textThreshold"] as? Double ?? 0.8),
            "minWords": call?.getInt("minWords") ?? Int(call?.getDouble("minWords") ?? Double(settings["minWords"] as? Int ?? 50)),
            "disabledAds": disabledAds,
            "disabledAi": disabledAi,
        ]
    }

    private func sandboxRoot() throws -> URL {
        let docs = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let root = docs.appendingPathComponent("ERDOS", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let notes = root.appendingPathComponent("Notes", isDirectory: true)
        let files = root.appendingPathComponent("Files", isDirectory: true)
        try FileManager.default.createDirectory(at: notes, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: files, withIntermediateDirectories: true)
        let welcome = notes.appendingPathComponent("Welcome.txt")
        if !FileManager.default.fileExists(atPath: welcome.path) {
            try "Welcome to ERDOS notes. What you write here stays on this phone.".write(to: welcome, atomically: true, encoding: .utf8)
        }
        return root
    }

    private func resolve(_ relative: String, create: Bool) throws -> URL {
        let root = try sandboxRoot()
        let parts = relative.split(separator: "/").map(String.init).filter { !$0.isEmpty && $0 != "." }
        if parts.contains("..") {
            throw NSError(domain: "erdos", code: 1, userInfo: [NSLocalizedDescriptionKey: "That path is not available."])
        }
        var url = root
        for part in parts { url.appendPathComponent(part) }
        let rootPath = root.standardizedFileURL.path
        let targetPath = url.standardizedFileURL.path
        if targetPath != rootPath && !targetPath.hasPrefix(rootPath + "/") {
            throw NSError(domain: "erdos", code: 2, userInfo: [NSLocalizedDescriptionKey: "That path is not available."])
        }
        if create && parts.isEmpty == false && !FileManager.default.fileExists(atPath: url.path) {
            return url
        }
        return url
    }
}

final class BlokScriptProxy: NSObject, WKScriptMessageHandler {
    weak var plugin: ErdosNativePlugin?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        plugin?.handleBlokMessage(message)
    }
}
