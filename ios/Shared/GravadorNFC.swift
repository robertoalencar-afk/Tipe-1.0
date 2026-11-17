import CoreNFC
import Foundation

/// Grava UM registro URL NDEF (o mesmo link do QR da mesa). Nunca bloqueia a etiqueta.
final class GravadorNFC: NSObject, ObservableObject, NFCNDEFReaderSessionDelegate {
  enum Estado: Equatable { case parado, aguardando, gravado, erro(String) }
  @Published var estado: Estado = .parado
  private var sessao: NFCNDEFReaderSession?
  private var pedido: PedidoGravacao?

  var disponivel: Bool { NFCNDEFReaderSession.readingAvailable }

  func gravar(_ pedido: PedidoGravacao) {
    guard disponivel else { estado = .erro("Este aparelho não tem NFC. Use um iPhone 7 ou mais novo."); return }
    self.pedido = pedido
    let s = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: false)
    s.alertMessage = "Aproxime a etiqueta da Mesa \(pedido.mesa) do topo do iPhone."
    sessao = s
    estado = .aguardando
    s.begin()
  }

  func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {}

  func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
    guard tags.count == 1, let tag = tags.first, let pedido else {
      session.alertMessage = "Aproxime só uma etiqueta por vez."
      session.restartPolling()
      return
    }
    session.connect(to: tag) { erro in
      if erro != nil { return self.falhar(session, "Etiqueta afastou. Tente de novo.") }
      tag.queryNDEFStatus { status, _, erro in
        if erro != nil { return self.falhar(session, "Não foi possível ler a etiqueta.") }
        switch status {
        case .notSupported: self.falhar(session, "Etiqueta não compatível com NDEF.")
        case .readOnly: self.falhar(session, "Etiqueta bloqueada (somente leitura).")
        case .readWrite:
          tag.readNDEF { atual, _ in
            let temConteudo = (atual?.records.contains { !$0.payload.isEmpty }) ?? false
            if temConteudo && !pedido.substituir && atual?.records.first?.wellKnownTypeURIPayload() != pedido.link {
              return self.falhar(session, "Etiqueta já gravada. Marque “Substituir” na Tipe e tente de novo.")
            }
            guard let registro = NFCNDEFPayload.wellKnownTypeURIPayload(url: pedido.link) else {
              return self.falhar(session, "Link da mesa inválido.")
            }
            tag.writeNDEF(NFCNDEFMessage(records: [registro])) { erro in
              if erro != nil { return self.falhar(session, "Não gravou. Confira se a etiqueta tem espaço.") }
              session.alertMessage = "Mesa \(pedido.mesa) gravada."
              session.invalidate()
              DispatchQueue.main.async { self.estado = .gravado }
            }
          }
        @unknown default: self.falhar(session, "Etiqueta não compatível.")
        }
      }
    }
  }

  func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
    let codigo = (error as? NFCReaderError)?.code
    DispatchQueue.main.async {
      if self.estado == .aguardando {
        self.estado = codigo == .readerSessionInvalidationErrorUserCanceled ? .parado : .erro("Gravação interrompida. Tente de novo.")
      }
      self.sessao = nil
    }
  }

  private func falhar(_ session: NFCNDEFReaderSession, _ msg: String) {
    session.invalidate(errorMessage: msg)
    DispatchQueue.main.async { self.estado = .erro(msg) }
  }
}
