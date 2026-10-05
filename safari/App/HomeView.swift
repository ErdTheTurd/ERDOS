import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var model: BlokModel

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                BlokColor.blue.ignoresSafeArea()
                Circle().fill(BlokColor.sky.opacity(0.4)).frame(width: 200).offset(x: 150, y: -40)
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        HStack(spacing: 10) {
                            BlokMark(size: 48)
                            Text("blok")
                                .font(.system(size: 40, weight: .heavy))
                                .tracking(-1.5)
                        }
                        Spacer()
                        NavigationLink("Settings") { SettingsView() }
                            .font(.body.weight(.heavy))
                    }
                    .foregroundStyle(.white)
                    Text("Covered until you tap.")
                        .font(.system(size: 34, weight: .heavy))
                        .tracking(-0.8)
                        .foregroundStyle(.white)
                        .padding(.top, 8)
                    Text("Today’s hides stay on this iPhone.")
                        .font(.body.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.top, 4)
                    ScrollView {
                        VStack(spacing: 12) {
                            BlokCard {
                                Text("Today").font(.title3.weight(.heavy))
                                HStack {
                                    count(model.stats.ads, "Ads")
                                    count(model.stats.text, "AI text")
                                    count(model.stats.image, "Images")
                                    count(model.stats.video, "Video")
                                    count(model.stats.audio, "Audio")
                                }
                            }
                            BlokCard {
                                Text("Enable in Safari").font(.title3.weight(.heavy))
                                EnableSteps()
                                Text(BlokCopy.olderPath)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(BlokColor.muted)
                            }
                            if !model.usesAppGroup {
                                BlokCard {
                                    Text("App Group")
                                        .font(.headline)
                                    Text("Settings stay inside the app until group.com.erdos.blok is on the signing team. The extension reads that group.")
                                        .font(.footnote.weight(.semibold))
                                        .foregroundStyle(BlokColor.muted)
                                }
                            }
                            NavigationLink {
                                SitesView()
                            } label: {
                                Text("Sites")
                                    .font(.body.weight(.heavy))
                                    .frame(maxWidth: .infinity, minHeight: 48)
                                    .background(BlokColor.mist)
                                    .foregroundStyle(BlokColor.deep)
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                        }
                        .padding(16)
                    }
                    .background(BlokColor.paper)
                    .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                    .padding(.top, 16)
                }
                .padding(.top, 8)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private func count(_ value: Int, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.title3.weight(.heavy))
                .foregroundStyle(BlokColor.deep)
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundStyle(BlokColor.muted)
        }
        .frame(maxWidth: .infinity)
    }
}
