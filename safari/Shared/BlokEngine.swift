import Foundation
import JavaScriptCore

final class BlokEngine {
    static let shared = BlokEngine()

    struct Result {
        var response: [String: Any]
        var state: Data
        var reloadBlocker: Bool
        var usesAppGroup: Bool
        var error: String?
    }

    private let queue = DispatchQueue(label: "com.erdos.blok.engine")
    private var context: JSContext?
    private var rulesJSON = "{\"ads\":[],\"trackers\":[],\"ai\":[],\"cosmetic\":[]}"
    private var scriptReady = false
    private var jsError: String?

    private init() {}

    func handle(_ message: [String: Any]) -> Result {
        queue.sync {
            prepareLocked()
            return evaluateLocked(message)
        }
    }

    private func prepareLocked() {
        if context == nil {
            let ctx = JSContext()!
            ctx.exceptionHandler = { [weak self] _, value in
                self?.jsError = value?.toString()
            }
            context = ctx
        }
        guard let context, !scriptReady else { return }
        jsError = nil
        if let url = Bundle.main.url(forResource: "blok-logic", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            context.evaluateScript(source)
        }
        if jsError == nil, context.objectForKeyedSubscript("BlokLogic")?.isUndefined == false {
            scriptReady = true
        }
        if let url = Bundle.main.url(forResource: "rules", withExtension: "json"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            rulesJSON = source
        }
    }

    private func evaluateLocked(_ message: [String: Any]) -> Result {
        let usesGroup = BlokAppGroup.containerURL != nil
        let url = BlokAppGroup.stateFileURL
        let directory = url.deletingLastPathComponent()
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        if !FileManager.default.fileExists(atPath: url.path) {
            try? Data("{}\n".utf8).write(to: url)
        }

        var stateData = (try? Data(contentsOf: url)) ?? Data("{}\n".utf8)
        var response: [String: Any] = ["ok": false, "error": "engine"]
        var reload = false
        var failure = jsError
        var coordError: NSError?
        NSFileCoordinator().coordinate(writingItemAt: url, options: [], error: &coordError) { writeURL in
            let current = (try? Data(contentsOf: writeURL)) ?? stateData
            let ran = self.runJS(message: message, state: current)
            response = ran.response
            reload = ran.reload
            failure = ran.error
            if let data = ran.stateData {
                stateData = data
                try? data.write(to: writeURL, options: .atomic)
            }
            if ran.reload, let list = ran.blockerList {
                self.writeBlocker(list)
            }
        }
        if let coordError, failure == nil {
            failure = coordError.localizedDescription
        }
        if reload {
            BlockerReload.reload()
        }
        return Result(response: response, state: stateData, reloadBlocker: reload, usesAppGroup: usesGroup, error: failure)
    }

    private func runJS(message: [String: Any], state: Data) -> (response: [String: Any], stateData: Data?, reload: Bool, blockerList: [Any]?, error: String?) {
        guard let context, scriptReady else {
            return (["ok": false, "error": "Blok logic is missing from the app bundle."], nil, false, nil, "missing-script")
        }
        jsError = nil
        let stateText = String(data: state, encoding: .utf8) ?? "{}"
        let messageText = jsonText(message)
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let script = """
        (() => {
          const state = \(stateText);
          const host = BlokLogic.createHost({
            settings: state.settings || {},
            records: state.records || [],
            stats: state.stats || {},
            rules: \(rulesJSON),
            appVersion: \(jsonText(version))
          });
          return JSON.stringify(host.handle(\(messageText)));
        })()
        """
        guard jsError == nil,
              let raw = context.evaluateScript(script)?.toString(),
              raw != "undefined",
              let data = raw.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return (["ok": false, "error": jsError ?? "engine"], nil, false, nil, jsError ?? "engine")
        }
        let response = BlokPlist.sanitize(object["response"] ?? [:]) as? [String: Any] ?? ["ok": false]
        let reload = (object["reloadBlocker"] as? NSNumber)?.boolValue ?? false
        let list = object["blockerList"] as? [Any]
        var stateData: Data?
        if let snapshot = object["state"] {
            stateData = try? JSONSerialization.data(withJSONObject: snapshot, options: [.prettyPrinted])
        }
        return (response, stateData, reload, list, jsError)
    }

    private func writeBlocker(_ list: [Any]) {
        guard JSONSerialization.isValidJSONObject(list),
              let data = try? JSONSerialization.data(withJSONObject: list, options: [.prettyPrinted]) else { return }
        let url = BlokAppGroup.blockerFileURL
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
    }

    private func jsonText(_ value: Any) -> String {
        if JSONSerialization.isValidJSONObject([value]) || JSONSerialization.isValidJSONObject(value) {
            if let data = try? JSONSerialization.data(withJSONObject: value),
               let text = String(data: data, encoding: .utf8) {
                return text
            }
        }
        if let text = value as? String,
           let data = try? JSONSerialization.data(withJSONObject: [text]),
           var wrapped = String(data: data, encoding: .utf8) {
            wrapped.removeFirst()
            wrapped.removeLast()
            return wrapped
        }
        return "null"
    }
}
