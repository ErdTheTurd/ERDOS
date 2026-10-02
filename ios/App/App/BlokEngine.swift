import Foundation
import WebKit

/* Placeholder stand-in for Blok's proprietary detectors.
   Scores follow iphone/js/blok-logic.js. Weights are not in this build.
   Corrections are kept for continual on-device learning. A share queue is
   filled only after an explicit opt-in, and this build never uploads it. */
enum BlokDetector {
    static let phrases = [
        "as an ai language model",
        "as a language model",
        "it's important to note",
        "it is important to note",
        "in today's rapidly",
        "in today\u{2019}s rapidly",
        "delve into",
        "tapestry of",
    ]

    static func hashText(_ text: String) -> String {
        var hash: Int32 = 5381
        for unit in text.utf16 {
            hash = hash &* 33 ^ Int32(unit)
        }
        return String(UInt32(bitPattern: hash), radix: 16)
    }

    static func mockText(_ text: String) -> (confidence: Double, signals: [String]) {
        let lower = text.lowercased()
        let signals = phrases.filter { lower.contains($0) }
        var confidence = 0.42 + Double(signals.count) * 0.18
        if confidence > 0.97 { confidence = 0.97 }
        confidence = (confidence * 100).rounded() / 100
        return (confidence, signals)
    }

    static func specs() -> [[String: Any]] {
        [
            ["id": "text", "beta": true, "proprietary": true, "placeholder": true, "learns": "on-device-continual"],
            ["id": "image", "beta": false, "proprietary": true, "placeholder": true, "learns": "on-device-continual"],
            ["id": "video", "beta": false, "proprietary": true, "placeholder": true, "learns": "on-device-continual"],
            ["id": "audio", "beta": false, "proprietary": true, "placeholder": true, "learns": "on-device-continual"],
        ]
    }
}

enum BlokRules {
    static func loadBundled() -> [String: [[String: Any]]] {
        let candidates = [
            Bundle.main.url(forResource: "rules", withExtension: "json", subdirectory: "public/blok"),
            Bundle.main.resourceURL?.appendingPathComponent("public/blok/rules.json"),
        ]
        for url in candidates.compactMap({ $0 }) {
            if let data = try? Data(contentsOf: url),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                var lists: [String: [[String: Any]]] = [:]
                for key in ["ads", "trackers", "ai", "cosmetic"] {
                    lists[key] = json[key] as? [[String: Any]] ?? []
                }
                return lists
            }
        }
        return ["ads": [], "trackers": [], "ai": [], "cosmetic": []]
    }

    static func patterns(for host: String) -> [String] {
        var name = host.lowercased()
        if name.hasPrefix("www.") { name.removeFirst(4) }
        guard !name.isEmpty, !name.contains("/") else { return [] }
        return [name, "*.\(name)"]
    }

    static func applying(_ rules: [[String: Any]], hosts: [String]) -> [[String: Any]] {
        var domains: [String] = []
        for host in hosts {
            for pattern in patterns(for: host) where !domains.contains(pattern) {
                domains.append(pattern)
            }
        }
        return rules.map { rule in
            var copy = rule
            var trigger = rule["trigger"] as? [String: Any] ?? [:]
            if !domains.isEmpty { trigger["unless-domain"] = domains }
            copy["trigger"] = trigger
            return copy
        }
    }

    static func bundledScript(_ name: String) -> String {
        let candidates = [
            Bundle.main.url(forResource: name, withExtension: "js", subdirectory: "public/blok"),
            Bundle.main.url(forResource: name, withExtension: "js", subdirectory: "public/js"),
            Bundle.main.resourceURL?.appendingPathComponent("public/blok/\(name).js"),
            Bundle.main.resourceURL?.appendingPathComponent("public/js/\(name).js"),
        ]
        for url in candidates.compactMap({ $0 }) {
            if let text = try? String(contentsOf: url, encoding: .utf8), !text.isEmpty {
                return text
            }
        }
        return ""
    }
}

final class BlokLearningStore {
    private let defaults = UserDefaults.standard
    private let recordsKey = "erdos.blok.records"
    private let settingsKey = "erdos.blok.settings"
    private let countsKey = "erdos.blok.counts"
    private let ioQueue = DispatchQueue(label: "erdos.blok.learning")

    func settings() -> [String: Any] {
        let stored = defaults.dictionary(forKey: settingsKey) ?? [:]
        var base: [String: Any] = [
            "visual": true,
            "textDetection": true,
            "textThreshold": 0.8,
            "minWords": 50,
            "shareFeedback": false,
            "reviewBeforeSending": true,
            "shareChoice": "unset",
        ]
        stored.forEach { base[$0.key] = $0.value }
        return base
    }

    func updateSettings(_ partial: [String: Any]) -> [String: Any] {
        var next = settings()
        partial.forEach { next[$0.key] = $0.value }
        defaults.set(next, forKey: settingsKey)
        return next
    }

    func records() -> [[String: Any]] {
        defaults.array(forKey: recordsKey) as? [[String: Any]] ?? []
    }

    func save(_ record: [String: Any]) -> [String: Any] {
        var all = records().filter { ($0["id"] as? String) != (record["id"] as? String) }
        all.append(record)
        if all.count > 1000 { all = Array(all.suffix(1000)) }
        defaults.set(all, forKey: recordsKey)
        protectFile()
        return record
    }

    func undo(id: String) {
        let all = records().map { record -> [String: Any] in
            guard record["id"] as? String == id else { return record }
            var copy = record
            copy["undone"] = true
            copy["sharing"] = ["eligible": false, "state": "on-device", "reason": "undone"]
            return copy
        }
        defaults.set(all, forKey: recordsKey)
    }

    func verdict(for hash: String) -> String? {
        let matches = records().filter { ($0["hash"] as? String) == hash && ($0["undone"] as? Bool) != true }
        return matches.last?["verdict"] as? String
    }

    func review(id: String, approve: Bool) {
        let all = records().map { record -> [String: Any] in
            guard record["id"] as? String == id else { return record }
            var copy = record
            copy["sharing"] = approve
                ? ["eligible": true, "state": "queued", "reason": "approved-on-device"]
                : ["eligible": false, "state": "on-device", "reason": "kept-local"]
            return copy
        }
        defaults.set(all, forKey: recordsKey)
    }

    func clear(scope: String) {
        if scope == "shared" {
            let all = records().map { record -> [String: Any] in
                let sharing = record["sharing"] as? [String: Any]
                let state = sharing?["state"] as? String ?? ""
                guard state == "queued" || state == "needs-review" else { return record }
                var copy = record
                copy["excerpt"] = ""
                copy["sharing"] = ["eligible": false, "state": "on-device", "reason": "deleted-share-copy"]
                return copy
            }
            defaults.set(all, forKey: recordsKey)
            return
        }
        defaults.set([], forKey: recordsKey)
    }

    func bump(_ kind: String) -> [String: Any] {
        let day = isoDay()
        var counts = defaults.dictionary(forKey: countsKey) ?? [:]
        if counts["date"] as? String != day {
            counts = ["date": day, "ads": 0, "overview": 0, "widget": 0, "text": 0, "image": 0, "video": 0, "audio": 0]
        }
        let field = ["ads": "ads", "overview": "overview", "widget": "widget", "text": "text", "image": "image", "video": "video", "audio": "audio"][kind] ?? kind
        let current = counts[field] as? Int ?? 0
        counts[field] = current + 1
        defaults.set(counts, forKey: countsKey)
        return counts
    }

    func counts() -> [String: Any] {
        let day = isoDay()
        let stored = defaults.dictionary(forKey: countsKey) ?? [:]
        if stored["date"] as? String != day {
            return ["date": day, "ads": 0, "overview": 0, "widget": 0, "text": 0, "image": 0, "video": 0, "audio": 0]
        }
        return stored
    }

    func snapshot() -> [String: Any] {
        let prefs = settings()
        let all = records()
        return [
            "records": all,
            "summary": summary(all),
            "queue": all.filter { record in
                let state = (record["sharing"] as? [String: Any])?["state"] as? String
                return record["undone"] as? Bool != true && (state == "needs-review" || state == "queued")
            },
            "shareChoice": prefs["shareChoice"] ?? "unset",
            "shareFeedback": prefs["shareFeedback"] ?? false,
            "reviewBeforeSending": prefs["reviewBeforeSending"] ?? true,
            "transport": "on-device-only",
            "detectors": BlokDetector.specs(),
        ]
    }

    func makeRecord(from body: [String: Any]) -> [String: Any] {
        let prefs = settings()
        let kind = body["kind"] as? String ?? "text"
        let manual = (body["source"] as? String) == "triple-tap" || (body["manual"] as? Bool) == true
        let sensitive = body["sensitive"] as? Bool == true
        let shareOn = prefs["shareFeedback"] as? Bool == true
        let eligible = shareOn && !sensitive
        let review = prefs["reviewBeforeSending"] as? Bool != false
        var shareState = "on-device"
        var shareReason = sensitive ? "sensitive-page" : "share-off"
        if eligible {
            shareState = review ? "needs-review" : "queued"
            shareReason = "opt-in"
        }
        let rawText = kind == "text" ? (body["text"] as? String ?? "") : ""
        let mediaKey = body["mediaKey"] as? String ?? ""
        let hash = (body["hash"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? BlokDetector.hashText(rawText.isEmpty ? "\(kind)|\(mediaKey)" : rawText)
        let now = ISO8601DateFormatter().string(from: Date())
        let id = (body["id"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "fb_\(BlokDetector.hashText(kind + hash + now))"
        var record: [String: Any] = [
            "version": 1,
            "id": id,
            "hash": hash,
            "kind": kind,
            "verdict": (body["verdict"] as? String) == "human" ? "human" : "ai",
            "confidenceSource": manual ? "manual" : "placeholder",
            "source": body["source"] as? String ?? (manual ? "triple-tap" : "buttons"),
            "signals": body["signals"] as? [String] ?? (manual ? ["manual"] : []),
            "domain": domain(body["domain"] as? String ?? ""),
            "at": now,
            "sensitive": sensitive,
            "excerpt": kind == "text" ? scrub(rawText) : "",
            "mediaKey": kind == "text" ? "" : mediaKey,
            "appVersion": "1.7.0",
            "learning": [
                "personal": true,
                "appliedToModel": false,
                "reason": "proprietary-weights-not-in-this-build",
                "modelId": kind,
            ],
            "sharing": [
                "eligible": eligible,
                "state": shareState,
                "reason": shareReason,
            ],
            "undone": false,
        ]
        if !manual, let number = body["score"] as? Double {
            record["score"] = number
        } else if !manual, let number = body["score"] as? Int {
            record["score"] = number
        }
        return record
    }

    private func summary(_ all: [[String: Any]]) -> [String: Any] {
        var result: [String: Any] = [:]
        for kind in ["text", "image", "video", "audio"] {
            let examples = all.filter { record in
                record["kind"] as? String == kind && record["undone"] as? Bool != true
            }
            result[kind] = [
                "examples": examples.count,
                "appliedToModel": 0,
                "proprietary": true,
                "placeholder": true,
                "beta": kind == "text",
                "learns": "on-device-continual",
            ]
        }
        return result
    }

    private func domain(_ host: String) -> String {
        host.lowercased().hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    private func scrub(_ text: String) -> String {
        var value = text
        if let email = try? NSRegularExpression(pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", options: [.caseInsensitive]) {
            value = email.stringByReplacingMatches(in: value, range: NSRange(value.startIndex..., in: value), withTemplate: "[email]")
        }
        if let phone = try? NSRegularExpression(pattern: "\\b(?:\\+?\\d{1,3}[\\s.-]?)?(?:\\(?\\d{3}\\)?[\\s.-]?)\\d{3}[\\s.-]?\\d{4}\\b") {
            value = phone.stringByReplacingMatches(in: value, range: NSRange(value.startIndex..., in: value), withTemplate: "[phone]")
        }
        if value.count > 4000 { return String(value.prefix(4000)) }
        return value
    }

    private func isoDay() -> String {
        String(ISO8601DateFormatter().string(from: Date()).prefix(10))
    }

    /* UserDefaults lives in the app container, which iOS encrypts with the
       device passcode while the phone is locked. */
    private func protectFile() {
        ioQueue.async {
            guard let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
            let prefs = library.appendingPathComponent("Preferences", isDirectory: true)
            try? FileManager.default.setAttributes(
                [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                ofItemAtPath: prefs.path
            )
        }
    }
}
