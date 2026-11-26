import SwiftUI

/// Tela única: mostra a mesa e grava. Abre pelo link /gravar-nfc vindo da Gestão (botão ou QR).
struct TelaGravar: View {
  @StateObject private var gravador = GravadorNFC()
  @State private var pedido: PedidoGravacao?

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text("Gravar etiqueta NFC").font(.title2.bold())
      if let pedido {
        Text("Mesa \(pedido.mesa)").font(.headline)
        Text(pedido.link.absoluteString).font(.footnote).foregroundStyle(.secondary).textSelection(.enabled)
        Button {
          gravador.gravar(pedido)
        } label: {
          Label(gravador.estado == .aguardando ? "Aguardando etiqueta…" : "Gravar etiqueta", systemImage: "wave.3.right")
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(Color(red: 0.05, green: 0.8, blue: 0.7))
        .disabled(gravador.estado == .aguardando)
        switch gravador.estado {
        case .gravado: Text("Pronto. Aproxime um celular da etiqueta e confira se abre a Mesa \(pedido.mesa).")
        case .erro(let msg): Text(msg).foregroundStyle(.red)
        default: EmptyView()
        }
      } else {
        Text("Abra pela Gestão → Totens → Gravar etiqueta NFC, tocando em “Gravar no iPhone”.")
          .foregroundStyle(.secondary)
      }
      Spacer()
    }
    .padding(20)
    .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { atividade in
      if let url = atividade.webpageURL { pedido = PedidoGravacao(invocacao: url) }
    }
    .onOpenURL { url in pedido = PedidoGravacao(invocacao: url) }
  }
}
