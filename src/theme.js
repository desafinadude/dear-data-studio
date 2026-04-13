export const T = {
  bg:     "#f0efed",
  p1:     "#f8f7f5",
  p2:     "#f0efec",
  border: "#ccc8c0",
  accent: "#c1440e",
  navy:   "#1d3557",
  ink:    "#1e1510",
  mid:    "#56463a",
  muted:  "#8a7d72",
  ghost:  "#dbd8d2",
}

export const inp = {
  padding:     "5px 9px",
  border:      `1px solid ${T.border}`,
  borderRadius: 3,
  background:  T.p1,
  fontSize:    13,
  color:       T.ink,
  fontFamily:  "'Courier Prime',monospace",
  outline:     "none",
}

export const mkId = () => Math.random().toString(36).slice(2)
