// Cerveau du Majordome — appelle Claude, qui range dans le Cerveau numérique (Notion).
// Variables d'environnement à définir dans Vercel :
//   ANTHROPIC_API_KEY   (obligatoire)
//   NOTION_TOKEN        (obligatoire pour écrire dans Notion)
//   NOTION_DATA_SOURCE  (id de la data source du Cerveau ; défaut ci-dessous)

const NOTION_DS = process.env.NOTION_DATA_SOURCE || "6afac3f7-a478-48a0-9c89-cbef61d0ac36";
const NOTION_VERSION = "2022-06-28";
const MODEL = process.env.MAJORDOME_MODEL || "claude-sonnet-4-5-20250929";

const SYSTEME = `Tu es le Majordome d'Amely, entrepreneuse à Majorque. Ton seul rôle : réduire sa charge mentale.
Tu ranges, tu classes, tu tries, tu clarifies. Pas de stratégie sauf si elle la demande.
TON : direct, simple, sans jargon, sans motivation creuse. Court, point par point. Français.

Quand Amely t'envoie une idée, une tâche, une pensée ou un document : range-la dans son Cerveau numérique avec l'outil ranger_entree.
- Déduis le Type (Idée, Tâche, Décision, Référence, Personne, Projet), le Projet (texte libre, ex "Perso"), la Prochaine action, l'Échéance si elle existe.
- Exemple : "j'aimerais une journée massage" -> Titre "Détente : journée massage et soins", Type "Idée", Projet "Perso".
- Si c'est ambigu, mets Statut "À clarifier" et pose UNE seule question courte.
Après avoir rangé, confirme en une ligne : quoi rangé, où.
Tu ne réponds à aucun mail, tu ne supprimes rien. Tu ne fais que ranger et clarifier.`;

const TOOLS = [{
  name: "ranger_entree",
  description: "Enregistre une entrée dans le Cerveau numérique (Notion) d'Amely.",
  input_schema: {
    type: "object",
    properties: {
      titre: { type: "string", description: "Titre court et clair" },
      type: { type: "string", enum: ["Idée", "Tâche", "Décision", "Référence", "Personne", "Projet", "Mail"] },
      projet: { type: "string", description: "Nom du projet, texte libre (ex: Perso, VAM). Vide si aucun." },
      statut: { type: "string", enum: ["À clarifier", "À faire", "En cours", "En attente", "Fini"] },
      prochaine_action: { type: "string" },
      echeance: { type: "string", description: "Date ISO AAAA-MM-JJ, ou vide" }
    },
    required: ["titre", "type", "statut"]
  }
}];

async function anthropic(body) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("Claude: " + r.status + " " + (await r.text()).slice(0, 300));
  return r.json();
}

async function notionCreate(props) {
  const properties = {
    "Titre": { title: [{ text: { content: props.titre || "Sans titre" } }] },
    "Type": { select: { name: props.type || "Idée" } },
    "Statut": { select: { name: props.statut || "À faire" } }
  };
  if (props.projet) properties["Projet"] = { rich_text: [{ text: { content: props.projet } }] };
  if (props.prochaine_action) properties["Prochaine action"] = { rich_text: [{ text: { content: props.prochaine_action } }] };
  if (props.echeance) properties["Échéance"] = { date: { start: props.echeance } };

  const r = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + process.env.NOTION_TOKEN,
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify({ parent: { type: "data_source_id", data_source_id: NOTION_DS }, properties })
  });
  if (!r.ok) throw new Error("Notion: " + r.status + " " + (await r.text()).slice(0, 300));
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Clé Anthropic manquante. Ajoute ANTHROPIC_API_KEY dans Vercel." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    let messages = (body.messages || []).map(m => ({ role: m.role, content: m.content }));

    let resp = await anthropic({ model: MODEL, max_tokens: 1024, system: SYSTEME, tools: TOOLS, messages });

    // Boucle d'outils (max 4 tours)
    for (let i = 0; i < 4 && resp.stop_reason === "tool_use"; i++) {
      messages.push({ role: "assistant", content: resp.content });
      const results = [];
      for (const block of resp.content) {
        if (block.type === "tool_use" && block.name === "ranger_entree") {
          let out;
          try {
            if (!process.env.NOTION_TOKEN) throw new Error("NOTION_TOKEN manquant");
            const page = await notionCreate(block.input);
            out = "Rangé dans le Cerveau : " + (block.input.titre || "") + " (" + (page.url || "ok") + ")";
          } catch (e) {
            out = "Échec du rangement Notion : " + e.message;
          }
          results.push({ type: "tool_result", tool_use_id: block.id, content: out });
        }
      }
      messages.push({ role: "user", content: results });
      resp = await anthropic({ model: MODEL, max_tokens: 1024, system: SYSTEME, tools: TOOLS, messages });
    }

    const reply = resp.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "C'est noté.";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
