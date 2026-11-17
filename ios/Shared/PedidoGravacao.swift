import Foundation

/// Lê o link de invocação https://tipe.digital/gravar-nfc?u=<link da mesa>&m=<mesa>&s=1
/// Mesmas regras da web (src/lib/tipe/nfc.ts): só HTTPS da Tipe, sem credenciais nem sessão do cliente.
struct PedidoGravacao: Equatable {
  let link: URL
  let mesa: String
  let substituir: Bool

  static let hostsTipe: Set<String> = ["tipe.digital", "www.tipe.digital"]

  init?(invocacao: URL) {
    guard let c = URLComponents(url: invocacao, resolvingAgainstBaseURL: false),
      let host = c.host, Self.hostsTipe.contains(host),
      c.path == "/gravar-nfc",
      let u = c.queryItems?.first(where: { $0.name == "u" })?.value,
      let link = URL(string: u), Self.linkValido(link)
    else { return nil }
    self.link = link
    let m = c.queryItems?.first(where: { $0.name == "m" })?.value ?? ""
    self.mesa = String(m.prefix(20))
    self.substituir = c.queryItems?.first(where: { $0.name == "s" })?.value == "1"
  }

  static func linkValido(_ url: URL) -> Bool {
    guard url.scheme == "https", let host = url.host, hostsTipe.contains(host),
      url.user == nil, url.password == nil
    else { return false }
    let nomes = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.map(\.name) ?? []
    return !nomes.contains("session") && !nomes.contains("session_token")
  }
}
