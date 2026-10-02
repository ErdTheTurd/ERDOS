import UIKit
import WebKit

/* Custom WKWebView for the phone browser. Content rules and the Blok
   page script attach here, not to the Capacitor shell. */
final class BlokBrowser: NSObject, WKNavigationDelegate {
    let contentController = WKUserContentController()
    private(set) var webView: WKWebView?
    var onNavigate: (([String: Any]) -> Void)?
    private var config: [String: Any] = [
        "ads": true,
        "ai": true,
        "visual": true,
        "textDetection": true,
        "textThreshold": 0.8,
        "minWords": 50,
        "disabledAds": [String](),
        "disabledAi": [String](),
    ]
    private var ruleLists: [WKContentRuleList] = []

    func attach(handler: WKScriptMessageHandler, host: UIView) {
        if webView == nil {
            let configuration = WKWebViewConfiguration()
            configuration.websiteDataStore = .default()
            configuration.userContentController = contentController
            if #available(iOS 14.0, *) {
                configuration.defaultWebpagePreferences.allowsContentJavaScript = true
            }
            installScripts()
            contentController.add(handler, name: "blok")
            let view = WKWebView(frame: .zero, configuration: configuration)
            view.navigationDelegate = self
            view.allowsBackForwardNavigationGestures = true
            view.scrollView.contentInsetAdjustmentBehavior = .never
            if #available(iOS 16.4, *) { view.isInspectable = true }
            view.isHidden = true
            webView = view
        }
        if let view = webView, view.superview !== host {
            host.addSubview(view)
        }
    }

    func setFrame(_ rect: CGRect) {
        webView?.frame = rect
    }

    func setVisible(_ visible: Bool) {
        webView?.isHidden = !visible
    }

    func load(urlString: String) {
        guard let url = URL(string: urlString), let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else { return }
        webView?.load(URLRequest(url: url))
    }

    func update(config next: [String: Any], rules: [String: [[String: Any]]]) {
        config = next
        installScripts()
        apply(rules: rules)
    }

    private func installScripts() {
        contentController.removeAllUserScripts()
        let json = (try? JSONSerialization.data(withJSONObject: config)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        let boot = "window.__BLOK_CONFIG__ = \(json);"
        contentController.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        let logic = BlokRules.bundledScript("blok-logic")
        if !logic.isEmpty {
            contentController.addUserScript(WKUserScript(source: logic, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        }
        let page = BlokRules.bundledScript("page-script")
        if !page.isEmpty {
            contentController.addUserScript(WKUserScript(source: page, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        }
    }

    private func apply(rules: [String: [[String: Any]]]) {
        let disabledAds = config["disabledAds"] as? [String] ?? []
        let disabledAi = config["disabledAi"] as? [String] ?? []
        let groups: [(String, [[String: Any]])] = [
            ("blok-ads", BlokRules.applying(rules["ads"] ?? [], hosts: disabledAds)),
            ("blok-trackers", BlokRules.applying(rules["trackers"] ?? [], hosts: disabledAds)),
            ("blok-ai", BlokRules.applying(rules["ai"] ?? [], hosts: disabledAi)),
            ("blok-cosmetic", BlokRules.applying(rules["cosmetic"] ?? [], hosts: disabledAds)),
        ]
        let group = DispatchGroup()
        var compiled: [WKContentRuleList] = []
        let lock = NSLock()
        for (identifier, list) in groups where !list.isEmpty {
            guard let data = try? JSONSerialization.data(withJSONObject: list),
                  let encoded = String(data: data, encoding: .utf8) else { continue }
            group.enter()
            WKContentRuleListStore.default().compileContentRuleList(forIdentifier: identifier, encodedContentRuleList: encoded) { ruleList, _ in
                if let ruleList {
                    lock.lock()
                    compiled.append(ruleList)
                    lock.unlock()
                }
                group.leave()
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            self.contentController.removeAllContentRuleLists()
            compiled.forEach { self.contentController.add($0) }
            self.ruleLists = compiled
            if self.webView?.url != nil {
                self.webView?.reload()
            }
        }
    }

    func state() -> [String: Any] {
        [
            "url": webView?.url?.absoluteString ?? "",
            "title": webView?.title ?? "",
            "canGoBack": webView?.canGoBack ?? false,
            "canGoForward": webView?.canGoForward ?? false,
            "loading": webView?.isLoading ?? false,
            "native": true,
        ]
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let scheme = navigationAction.request.url?.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }
        if scheme == "http" || scheme == "https" || scheme == "about" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        onNavigate?(state())
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        onNavigate?(state())
    }
}
