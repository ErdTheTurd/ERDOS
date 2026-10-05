import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject private var model: BlokModel
    @State private var page = 0

    var body: some View {
        ZStack {
            BlokColor.blue.ignoresSafeArea()
            Circle().fill(BlokColor.sky.opacity(0.45)).frame(width: 220).offset(x: 140, y: -280)
            Circle().fill(BlokColor.sky.opacity(0.35)).frame(width: 180).offset(x: -150, y: 220)
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    BlokMark()
                    Text("blok")
                        .font(.system(size: 40, weight: .heavy))
                        .tracking(-1.5)
                }
                .padding(.top, 12)
                .foregroundStyle(.white)
                Spacer().frame(height: 18)
                Text(title)
                    .font(.system(size: 36, weight: .heavy))
                    .tracking(-1)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
                Text(bodyText)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.top, 8)
                if page == 1 {
                    EnableSteps(onBlue: true).padding(.top, 16)
                    Text(BlokCopy.olderPath)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.9))
                        .padding(.top, 8)
                }
                if !model.status.isEmpty {
                    Text(model.status)
                        .font(.footnote.weight(.semibold))
                        .padding(.top, 12)
                }
                Spacer()
                HStack(spacing: 8) {
                    Button("Skip") { model.finishOnboarding() }
                        .font(.body.weight(.heavy))
                        .foregroundStyle(.white)
                        .frame(minHeight: 48)
                    Button(page == 2 ? "Start blocking" : "Next") {
                        if page < 2 { page += 1 } else { model.finishOnboarding() }
                    }
                    .font(.body.weight(.heavy))
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(Color.white)
                    .foregroundStyle(BlokColor.deep)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .padding(.bottom, 12)
            }
            .padding(.horizontal, 22)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private var title: String {
        switch page {
        case 0: return "Ads and AI, covered until you tap."
        case 1: return "Turn it on in Safari."
        default: return "It stays on this iPhone."
        }
    }

    private var bodyText: String {
        switch page {
        case 0:
            return "Blok hides ads, trackers, and AI content in Safari. Tap a placeholder to show it again. Text detection is Beta."
        case 1:
            return "Blok cannot block until Safari is allowed to use the extension."
        default:
            return "Corrections stay on this phone. Share feedback is off. The detectors in this build are placeholders, and text detection is marked Beta."
        }
    }
}
