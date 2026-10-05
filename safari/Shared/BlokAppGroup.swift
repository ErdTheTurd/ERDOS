import Foundation

enum BlokAppGroup {
    static let identifier = "group.com.erdos.blok"
    static let appBundleID = "com.erdos.blok"
    static let webExtensionBundleID = "com.erdos.blok.Extension"
    static let contentBlockerBundleID = "com.erdos.blok.ContentBlocker"

    static var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }

    /// App Group container when the entitlement is present, otherwise a private
    /// folder so the app can still open before signing is configured.
    static var storageDirectory: URL {
        if let containerURL { return containerURL }
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory())
        return base.appendingPathComponent("Blok", isDirectory: true)
    }

    static var stateFileURL: URL {
        storageDirectory.appendingPathComponent("blok-state.json")
    }

    static var blockerFileURL: URL {
        storageDirectory.appendingPathComponent("blockerList.json")
    }

    static func sharedBlockerURL() -> URL? {
        guard let containerURL else { return nil }
        let url = containerURL.appendingPathComponent("blockerList.json")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }
}
