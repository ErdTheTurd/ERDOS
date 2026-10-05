import Foundation

final class ContentBlockerRequestHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let bundled = Bundle.main.url(forResource: "blockerList", withExtension: "json")
        let url = BlokAppGroup.sharedBlockerURL() ?? bundled
        guard let url, let attachment = NSItemProvider(contentsOf: url) else {
            context.cancelRequest(withError: NSError(
                domain: "Blok",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Missing blocker list"]
            ))
            return
        }
        let item = NSExtensionItem()
        item.attachments = [attachment]
        context.completeRequest(returningItems: [item], completionHandler: nil)
    }
}
