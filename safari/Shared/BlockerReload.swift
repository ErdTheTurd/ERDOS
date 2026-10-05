import Foundation
import SafariServices

enum BlockerReload {
    static func reload() {
        SFContentBlockerManager.reloadContentBlocker(withIdentifier: BlokAppGroup.contentBlockerBundleID) { error in
            if let error {
                NSLog("Blok content blocker reload failed: %@", error.localizedDescription)
            }
        }
    }
}

enum BlokPlist {
    static func sanitize(_ value: Any) -> Any? {
        if value is NSNull { return nil }
        if let dict = value as? [String: Any] {
            var copy: [String: Any] = [:]
            for (key, item) in dict {
                if let safe = sanitize(item) {
                    copy[key] = safe
                }
            }
            return copy
        }
        if let list = value as? [Any] {
            return list.compactMap { sanitize($0) }
        }
        return value
    }
}
