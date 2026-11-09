// Metro: o app reaproveita as regras puras do Tipe Guest que vivem no site (src/lib/tipe/guest),
// para que horários, garantia e fila sigam exatamente o mesmo cálculo do motor de reservas.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../../src/lib/tipe/guest")];
module.exports = config;
