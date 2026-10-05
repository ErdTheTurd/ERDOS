import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems.first as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey] as? [String: Any] ?? [:]
        let result = BlokEngine.shared.handle(message)
        let response = BlokPlist.sanitize(result.response) as? [String: Any] ?? ["ok": false]
        let output = NSExtensionItem()
        output.userInfo = [SFExtensionMessageKey: response]
        context.completeRequest(returningItems: [output], completionHandler: nil)
    }
}
