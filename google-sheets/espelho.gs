/**
 * Lowfy Pro — recebe eventos do servidor e grava no Google Sheets.
 * Como instalar (5 minutos):
 * 1. Abra a planilha "Ferramenta Lowticket" → Extensões → Apps Script.
 * 2. Cole este código num arquivo novo e salve.
 * 3. Em "Configurações do projeto" → "Propriedades do script", crie TOKEN com uma senha longa qualquer.
 * 4. Implantar → Nova implantação → Tipo: App da Web → Executar como: Eu → Quem pode acessar: Qualquer pessoa.
 * 5. Copie a URL e salve no Supabase como segredo SHEETS_WEBHOOK_URL, no formato: <URL>?token=<TOKEN>
 */
var COLUNAS = {
  'Pro – Clientes': ['data', 'email', 'plano', 'status', 'creditos'],
  'Pro – Vendas':   ['data', 'email', 'produto', 'valor', 'evento'],
  'Pro – Gerações': ['data', 'email', 'funil', 'etapa', 'modelo', 'tokens_entrada', 'tokens_saida', 'custo_usd'],
  'Radar':          ['semana', 'fonte', 'nicho', 'anunciante', 'dias_ativo', 'angulo', 'gancho', 'analise', 'link_oficial']
};

function doPost(e) {
  var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!token || e.parameter.token !== token) {
    return ContentService.createTextOutput('nao autorizado');
  }
  var corpo = JSON.parse(e.postData.contents);
  var colunas = COLUNAS[corpo.aba];
  if (!colunas) return ContentService.createTextOutput('aba desconhecida');

  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(corpo.aba) || planilha.insertSheet(corpo.aba);
  if (aba.getLastRow() === 0) {
    aba.appendRow(colunas);
    aba.setFrozenRows(1);
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    aba.appendRow(colunas.map(function (c) { return corpo.linha[c] === undefined ? '' : corpo.linha[c]; }));
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}
