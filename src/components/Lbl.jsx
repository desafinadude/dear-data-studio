import { T } from "../theme.js"

export default function Lbl({ c, children }) {
  return (
    <div style={{ fontSize: 11, color: c || T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1.1 }}>
      {children}
    </div>
  )
}
