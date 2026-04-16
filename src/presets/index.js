export const PRESETS = [
  {
    name: "Week 40: New People (Giorgia)",
    emoji: "👥",
    numRows: 20,
    vars: [
      { name: "type",               type: "category", options: "new,reunion" },
      { name: "gender",             type: "category", options: "man,woman,nonbinary", has_color: true, colors: "#12c7b5,#ffc835,#9ec521" },
      { name: "where_met",          type: "category", options: "school,home,other" },
      { name: "introducer",         type: "category", options: "them,me,friend" },
      { name: "supposed_to_know", type: "category", options: "yes,no" },
      { name: "spoke_more_than_intro", type: "category", options: "yes,no" },
    ],
  },
  {
    name: "distractions",
    emoji: "🔔",
    numRows: 28,
    vars: [
      { name: "distraction_length",        type: "number", min: 1, max: 60 },
      { name: "main_activity",             type: "category", options: "working,music,supper,playing,meeting", has_color: false },
      { name: "main_activity_subcategory", type: "category", options: "email,writing,kids,", has_color: false },
      { name: "distraction",               type: "category", options: "kids,phone,whatsapp,door", has_color: false },
      { name: "distraction_subcategory",   type: "category", options: "andy,family,friend,spam", has_color: false },
    ],
  },
]

// Generate a pleasant random color palette
function generateRandomColors(count) {
  const palettes = [
    ["#c1440e", "#1d3557", "#2d6a4f", "#c9972b", "#9b2226", "#457b9d", "#606c38", "#7209b7"],
    ["#e09f3e", "#9e2a2b", "#457b9d", "#2d6a4f", "#c1440e", "#606c38", "#1d3557"],
    ["#ef6c00", "#7209b7", "#2d6a4f", "#c9972b", "#9b2226", "#1d3557"],
  ]
  const palette = palettes[Math.floor(Math.random() * palettes.length)]
  const colors = []
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length])
  }
  return colors
}

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
