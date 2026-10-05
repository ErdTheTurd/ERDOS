import SwiftUI

struct SitesView: View {
    @EnvironmentObject private var model: BlokModel
    @Environment(\.dismiss) private var dismiss
    @State private var draft = ""

    var body: some View {
        ZStack(alignment: .top) {
            BlokColor.blue.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                Button("Back") { dismiss() }
                    .font(.body.weight(.heavy))
                    .foregroundStyle(.white)
                    .frame(minHeight: 44)
                Text("Sites")
                    .font(.system(size: 36, weight: .heavy))
                    .foregroundStyle(.white)
                Text("Ads and AI can be paused on one site at a time.")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.top, 4)
                ScrollView {
                    VStack(spacing: 12) {
                        BlokCard {
                            TextField("example.com", text: $draft)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .padding(.horizontal, 12)
                                .frame(minHeight: 48)
                                .background(BlokColor.mist)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .accessibilityLabel("Site")
                            Button("Pause this site") {
                                let host = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !host.isEmpty else { return }
                                model.send("pause-site", fields: ["host": host, "paused": true])
                                draft = ""
                            }
                            .font(.body.weight(.heavy))
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(BlokColor.mist)
                            .foregroundStyle(BlokColor.deep)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        if model.knownSites.isEmpty {
                            Text("No paused sites yet. You can also pause the open site from the Safari popup.")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(BlokColor.muted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        ForEach(model.knownSites, id: \.self) { host in
                            BlokCard {
                                Text(host).font(.headline)
                                HStack(spacing: 8) {
                                    siteButton(host, kind: "Ads")
                                    siteButton(host, kind: "AI")
                                }
                            }
                        }
                    }
                    .padding(16)
                }
                .background(BlokColor.paper)
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(.top, 16)
            }
            .padding(.horizontal, 22)
            .padding(.top, 8)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .toolbar(.hidden, for: .navigationBar)
    }

    private func siteButton(_ host: String, kind: String) -> some View {
        let ads = model.adsOn(host)
        let ai = model.aiOn(host)
        let on = kind == "Ads" ? ads : ai
        return Button("\(kind): \(on ? "on" : "off")") {
            model.send("set-site", fields: [
                "host": host,
                "ads": kind == "Ads" ? !ads : ads,
                "ai": kind == "AI" ? !ai : ai,
            ])
        }
        .font(.subheadline.weight(.heavy))
        .frame(maxWidth: .infinity, minHeight: 44)
        .background(BlokColor.mist)
        .foregroundStyle(BlokColor.deep)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
