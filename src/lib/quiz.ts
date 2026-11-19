export type Pergunta =
  | { id: string; titulo: string; tipo: "opcoes"; opcoes: string[] }
  | { id: string; titulo: string; tipo: "texto"; dica?: string };

// As mesmas 10 perguntas do Lowfy grátis
export const PERGUNTAS: Pergunta[] = [
  { id: "area", titulo: "Em qual área você possui mais conhecimento ou experiência?", tipo: "opcoes",
    opcoes: ["Marketing e vendas", "Saúde e bem-estar", "Beleza e estética", "Finanças", "Relacionamentos",
      "Desenvolvimento pessoal", "Alimentação e culinária", "Profissão ou habilidade técnica", "Artesanato", "Outro"] },
  { id: "ajuda", titulo: "O que as pessoas normalmente pedem sua ajuda para resolver?", tipo: "texto",
    dica: "Ex.: montar cardápio para emagrecer sem passar fome" },
  { id: "resultado", titulo: "Qual resultado você já conseguiu gerar para você ou para outra pessoa?", tipo: "texto",
    dica: "Seja específico: números, prazos, quem foi ajudado" },
  { id: "publico", titulo: "Quem você gostaria de ajudar?", tipo: "texto", dica: "Ex.: mães de 30 a 45 anos sem tempo" },
  { id: "problema", titulo: "Qual é o principal problema desse público?", tipo: "texto",
    dica: "Escreva como essa pessoa falaria no WhatsApp" },
  { id: "formato", titulo: "Qual formato você teria mais facilidade para produzir?", tipo: "opcoes",
    opcoes: ["Ebook ou guia", "Videoaulas", "Planilha", "Checklist", "Templates e modelos", "Desafio prático", "Mini curso", "Ainda não sei"] },
  { id: "tempo", titulo: "Quanto tempo você consegue dedicar à criação do produto?", tipo: "opcoes",
    opcoes: ["Algumas horas", "Um dia", "Até 3 dias", "Uma semana", "Mais de uma semana"] },
  { id: "aparecer", titulo: "Você gostaria de aparecer nas aulas ou nos conteúdos?", tipo: "opcoes",
    opcoes: ["Sim", "Não", "Talvez", "Prefiro um produto sem aulas"] },
  { id: "audiencia", titulo: "Você já possui audiência nas redes sociais?", tipo: "opcoes",
    opcoes: ["Ainda não tenho audiência", "Até 1.000 seguidores", "De 1.000 a 10.000 seguidores", "Mais de 10.000 seguidores", "Tenho uma base de clientes"] },
  { id: "objetivo", titulo: "Qual é o principal objetivo com esse produto?", tipo: "opcoes",
    opcoes: ["Fazer minhas primeiras vendas", "Gerar renda extra", "Atrair clientes para um serviço", "Criar uma esteira de produtos", "Validar uma ideia", "Construir autoridade"] },
];

export const CHAVE_QUIZ = "lowfy_pro_quiz";
