export const PRESETS = [
  {
    name: "week diary",
    emoji: "📅",
    numRows: 7,
    vars: [
      { name: "day",       type: "category", options: "Mon,Tue,Wed,Thu,Fri,Sat,Sun" },
      { name: "coffee",    type: "number",   min: 0, max: 6 },
      { name: "meetings",  type: "number",   min: 0, max: 8 },
      { name: "focus_hrs", type: "number",   min: 0, max: 8 },
      { name: "mood",      type: "number",   min: 1, max: 4 },
      { name: "rained",    type: "number",   min: 0, max: 1 },
    ],
  },
  {
    name: "monthly mood",
    emoji: "🌙",
    numRows: 4,
    vars: [
      { name: "week",       type: "category", options: "Wk 1,Wk 2,Wk 3,Wk 4" },
      { name: "energy",     type: "number",   min: 1, max: 10 },
      { name: "social",     type: "number",   min: 1, max: 10 },
      { name: "creativity", type: "number",   min: 1, max: 10 },
    ],
  },
  {
    name: "reading log",
    emoji: "📚",
    numRows: 5,
    vars: [
      { name: "book",   type: "category", options: "Book A,Book B,Book C,Book D,Book E" },
      { name: "pages",  type: "number",   min: 5,  max: 60 },
      { name: "rating", type: "number",   min: 1,  max: 5 },
      { name: "genre",  type: "category", options: "fiction,nonfiction,poetry" },
    ],
  },
  {
    name: "distractions",
    emoji: "🔔",
    numRows: 28,
    vars: [
      { name: "distraction_length",        type: "number", min: 1, max: 60 },
      { name: "main_activity",             type: "category", options: "working,music,supper,playing,meeting" },
      { name: "main_activity_subcategory", type: "category", options: "email,writing,kids," },
      { name: "distraction",               type: "category", options: "kids,phone,whatsapp,door" },
      { name: "distraction_subcategory",   type: "category", options: "andy,family,friend,spam" },
    ],
  },
]

export function genData(vars, n) {
  return Array.from({ length: n }, (_, ri) => {
    const row = {}
    vars.forEach(v => {
      if (!v.name.trim()) return
      if (v.type === "number") {
        row[v.name] = Math.floor(Math.random() * (+(v.max || 10) - +(v.min || 0) + 1)) + +(v.min || 0)
      } else {
        const opts = v.options.split(",").map(s => s.trim()).filter(Boolean)
        row[v.name] = opts.length
          ? (opts.length === n ? opts[ri] : opts[Math.floor(Math.random() * opts.length)])
          : `item ${ri + 1}`
      }
    })
    return row
  })
}
