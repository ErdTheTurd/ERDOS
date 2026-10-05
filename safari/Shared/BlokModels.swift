import Foundation

struct BlokSettings: Codable, Equatable {
    init() {}

    var ads: Bool = true
    var ai: Bool = true
    var visual: Bool = true
    var textDetection: Bool = true
    var shareFeedback: Bool = false
    var shareChoice: String = "unset"
    var reviewBeforeSending: Bool = true
    var disabledAds: [String] = []
    var disabledAi: [String] = []
    var pausedSites: [String] = []
    var onboardingDone: Bool = false
    var textThreshold: Double = 0.8
    var minWords: Int = 50
}

struct BlokStats: Codable, Equatable {
    init() {}

    var day: String = ""
    var ads: Int = 0
    var text: Int = 0
    var image: Int = 0
    var video: Int = 0
    var audio: Int = 0
    var overview: Int = 0
    var widget: Int = 0
}

struct BlokSharing: Codable, Equatable {
    var eligible: Bool?
    var state: String?
    var reason: String?
}

struct BlokFeedback: Codable, Equatable, Identifiable {
    var id: String
    var hash: String?
    var kind: String?
    var verdict: String?
    var domain: String?
    var at: String?
    var excerpt: String?
    var source: String?
    var sharing: BlokSharing?
    var undone: Bool?
}

struct BlokDetectorSummary: Codable, Equatable {
    var examples: Int?
    var appliedToModel: Int?
    var proprietary: Bool?
    var placeholder: Bool?
    var beta: Bool?
    var learns: String?
}

struct BlokSnapshot: Codable {
    init() {}

    var settings: BlokSettings = BlokSettings()
    var stats: BlokStats = BlokStats()
    var records: [BlokFeedback] = []
    var queue: [BlokFeedback] = []
    var summary: [String: BlokDetectorSummary] = [:]
    var knownSites: [String] = []
}
