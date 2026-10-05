import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var model: BlokModel
    @Environment(\.dismiss) private var dismiss
    @State private var trial = ""

    var body: some View {
        ZStack(alignment: .top) {
            BlokColor.blue.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                Button("Back") { dismiss() }
                    .font(.body.weight(.heavy))
                    .foregroundStyle(.white)
                    .frame(minHeight: 44)
                Text("Settings")
                    .font(.system(size: 36, weight: .heavy))
                    .foregroundStyle(.white)
                ScrollView {
                    VStack(spacing: 12) {
                        BlokCard {
                            Text("Look").font(.title3.weight(.heavy))
                            HStack(spacing: 8) {
                                modeButton("Visual", visual: true)
                                modeButton("Clean", visual: false)
                            }
                        }
                        BlokCard {
                            Text("Beta")
                                .font(.caption.weight(.heavy))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(BlokColor.mist)
                                .foregroundStyle(BlokColor.deep)
                                .clipShape(Capsule())
                            toggleRow(
                                "Text detection",
                                "Hides a long block at 80% or more. Placeholder score.",
                                model.settings.textDetection
                            ) { model.send("set-settings", fields: ["patch": ["textDetection": $0]]) }
                        }
                        BlokCard {
                            Text("Feedback").font(.title3.weight(.heavy))
                            Text("Off by default. If you turn sharing on, a review queue on this iPhone can hold the text (emails and numbers removed) or a media link, the site domain, the score, your answer, and the app version. History, cookies, logins, and password pages are not included. This build does not upload anything.")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(BlokColor.muted)
                            toggleRow(
                                "Share feedback",
                                "Default off. Nothing leaves this iPhone in this build.",
                                model.settings.shareFeedback
                            ) { model.send("set-settings", fields: ["patch": ["shareFeedback": $0]]) }
                            toggleRow(
                                "Review before sending",
                                "You approve each one on this iPhone.",
                                model.settings.reviewBeforeSending
                            ) { model.send("set-settings", fields: ["patch": ["reviewBeforeSending": $0]]) }
                            if model.queue.isEmpty {
                                Text("No corrections are waiting to be shared.")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(BlokColor.muted)
                            } else {
                                ForEach(model.queue) { item in
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("\(item.kind ?? "item") · \(item.verdict ?? "") · \(item.sharing?.state ?? "")")
                                            .font(.footnote.weight(.semibold))
                                        if item.sharing?.state == "needs-review" {
                                            HStack {
                                                Button("Approve") {
                                                    model.send("review-share", fields: ["id": item.id, "approve": true])
                                                }
                                                Button("Keep local") {
                                                    model.send("review-share", fields: ["id": item.id, "approve": false])
                                                }
                                            }
                                            .buttonStyle(.bordered)
                                        }
                                    }
                                }
                            }
                            plainButton("Delete what I've queued") {
                                model.send("clear-learning", fields: ["scope": "shared"])
                            }
                            plainButton("Delete on-device learning") {
                                model.send("clear-learning", fields: ["scope": "all"])
                            }
                        }
                        BlokCard {
                            Text("Detectors").font(.title3.weight(.heavy))
                            detector("Text", "Beta · placeholder, not the proprietary model", model.summary["text"])
                            detector("Image", "Proprietary · not installed", model.summary["image"])
                            detector("Video", "Proprietary · not installed", model.summary["video"])
                            detector("Audio", "Proprietary · not installed", model.summary["audio"])
                            plainButton("Try the text placeholder") {
                                trial = model.placeholderTrial()
                            }
                            if !trial.isEmpty {
                                Text(trial)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(BlokColor.muted)
                            }
                        }
                        BlokCard {
                            Text("Safari").font(.title3.weight(.heavy))
                            EnableSteps()
                            Text(BlokCopy.olderPath)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(BlokColor.muted)
                        }
                    }
                    .padding(16)
                }
                .background(BlokColor.paper)
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(.top, 12)
            }
            .padding(.horizontal, 22)
            .padding(.top, 8)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func modeButton(_ title: String, visual: Bool) -> some View {
        let selected = model.settings.visual == visual
        return Button(title) {
            model.send("set-settings", fields: ["patch": ["visual": visual]])
        }
        .font(.body.weight(.heavy))
        .frame(maxWidth: .infinity, minHeight: 44)
        .background(selected ? BlokColor.blue : BlokColor.mist)
        .foregroundStyle(selected ? Color.white : BlokColor.deep)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityAddTraits(selected ? AccessibilityTraits.isSelected : AccessibilityTraits())
    }

    private func toggleRow(_ title: String, _ detail: String, _ on: Bool, set: @escaping (Bool) -> Void) -> some View {
        Button {
            set(!on)
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.body.weight(.heavy)).foregroundStyle(BlokColor.ink)
                    Text(detail).font(.footnote.weight(.semibold)).foregroundStyle(BlokColor.muted)
                }
                Spacer()
                BlokSwitch(on: on)
            }
            .frame(minHeight: 52)
        }
        .accessibilityLabel(title)
        .accessibilityValue(on ? "On" : "Off")
    }

    private func detector(_ title: String, _ detail: String, _ info: BlokDetectorSummary?) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.heavy))
                Text(detail).font(.footnote.weight(.semibold)).foregroundStyle(BlokColor.muted)
            }
            Spacer()
            Text("\(info?.examples ?? 0)").font(.body.weight(.heavy))
        }
    }

    private func plainButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.body.weight(.heavy))
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(BlokColor.mist)
            .foregroundStyle(BlokColor.deep)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
