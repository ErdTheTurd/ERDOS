import SwiftUI

@MainActor
final class BlokModel: ObservableObject {
    @Published var settings = BlokSettings()
    @Published var stats = BlokStats()
    @Published var records: [BlokFeedback] = []
    @Published var queue: [BlokFeedback] = []
    @Published var knownSites: [String] = []
    @Published var summary: [String: BlokDetectorSummary] = [:]
    @Published var usesAppGroup = false
    @Published var status = ""

    init() {
        apply(BlokEngine.shared.handle(["type": "state", "writeRules": true]))
    }

    func send(_ type: String, fields: [String: Any] = [:]) {
        var message = fields
        message["type"] = type
        apply(BlokEngine.shared.handle(message))
    }

    func finishOnboarding() {
        send("set-settings", fields: ["patch": ["onboardingDone": true]])
    }

    func placeholderTrial() -> String {
        let result = BlokEngine.shared.handle([
            "type": "detect-text",
            "text": BlokCopy.sample,
        ])
        apply(result)
        let confidence = (result.response["confidence"] as? NSNumber)?.doubleValue ?? 0
        let percent = Int((confidence * 100).rounded())
        let words = BlokCopy.sample.split { $0.isWhitespace }.count
        let hide = confidence >= 0.8 && words >= 50
        return "Placeholder \(percent)% · \(hide ? "would hide" : "would show") · Beta"
    }

    func adsOn(_ host: String) -> Bool {
        !settings.disabledAds.contains(host) && !settings.pausedSites.contains(host)
    }

    func aiOn(_ host: String) -> Bool {
        !settings.disabledAi.contains(host) && !settings.pausedSites.contains(host)
    }

    private func apply(_ result: BlokEngine.Result) {
        usesAppGroup = result.usesAppGroup
        status = result.error ?? ""
        guard let snapshot = try? JSONDecoder().decode(BlokSnapshot.self, from: result.state) else { return }
        settings = snapshot.settings
        stats = snapshot.stats
        records = snapshot.records
        queue = snapshot.queue
        knownSites = snapshot.knownSites
        summary = snapshot.summary
    }
}
