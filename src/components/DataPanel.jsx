import { useState, useEffect } from "react"
import Papa from "papaparse"
import { T, inp, mkId } from "../theme.js"
import { PRESETS, genData } from "../presets/index.js"
import Lbl from "./Lbl.jsx"

export default function DataPanel({ setCsv, setColumns, setColorMappings }) {
  const [src,   setSrc] = useState("sample")
  const [dvars, setDV]  = useState(PRESETS[0].vars.map((v, i) => ({ ...v, id: i })))
  const [nRows, setNR]  = useState(PRESETS[0].numRows)
  const [prev,  setPrev] = useState(null)
  const [pC,    setPC]   = useState([])

  // Rebuild color mappings whenever dvars or prev changes
  useEffect(() => {
    if (!prev || prev.length === 0) return
    
    const mappings = {}
    dvars.forEach(v => {
      if (v.type === "category" && v.name.trim()) {
        const opts = v.options.split(",").map(s => s.trim()).filter(Boolean)
        const cols = (v.colors || "").split(",").map(s => s.trim()).filter(Boolean)
        const colorMap = {}
        opts.forEach((opt, i) => {
          colorMap[opt] = cols[i] || generateRandomColor()
        })
        mappings[v.name.trim()] = colorMap
      }
    })
    
    setColorMappings(mappings)
  }, [dvars, prev, setColorMappings])

  const push = d => {
    const c = Object.keys(d[0] || {})
    setCsv(d); setColumns(c); setPrev(d); setPC(c)
    
    // Build color mappings from dvars AND from actual data
    const mappings = {}
    
    // First, get mappings from dvars (for generated data)
    dvars.forEach(v => {
      if (v.type === "category" && v.name.trim()) {
        const opts = v.options.split(",").map(s => s.trim()).filter(Boolean)
        const cols = (v.colors || "").split(",").map(s => s.trim()).filter(Boolean)
        const colorMap = {}
        opts.forEach((opt, i) => {
          colorMap[opt] = cols[i] || generateRandomColor()
        })
        mappings[v.name.trim()] = colorMap
      }
    })
    
    // Then, for uploaded CSV data, detect categorical columns and build mappings
    // from actual data values (this ensures uploaded data gets color mappings)
    c.forEach(colName => {
      const values = d.map(row => row[colName])
      const isNumeric = values.every(v => v === null || v === undefined || v === "" || typeof v === "number")
      
      if (!isNumeric) {
        // It's categorical - get unique values
        const uniqueVals = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ""))]
        
        // Check if we already have mapping from dvars
        if (!mappings[colName]) {
          // Create new mapping for this column
          const colorMap = {}
          uniqueVals.forEach((val, i) => {
            colorMap[val] = generateRandomColor()
          })
          mappings[colName] = colorMap
        } else {
          // Merge with existing mapping - add any new values not yet mapped
          uniqueVals.forEach(val => {
            if (!mappings[colName][val]) {
              mappings[colName][val] = generateRandomColor()
            }
          })
        }
      }
    })
    
    setColorMappings(mappings)
  }

  const generateRandomColor = () => {
    const colors = ["#c1440e", "#1d3557", "#2d6a4f", "#c9972b", "#9b2226", "#457b9d", "#606c38", "#7209b7", "#ef6c00"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const upd = (id, f, v) => setDV(p => p.map(x => x.id === id ? { ...x, [f]: v } : x))
  
  // Update cell in data table
  const updCell = (rowIdx, col, val) => {
    setPrev(p => {
      const newData = [...p]
      const varDef = dvars.find(v => v.name === col)
      // Try to parse as number if the column is numeric type
      if (varDef?.type === "number") {
        const num = parseFloat(val)
        newData[rowIdx] = { ...newData[rowIdx], [col]: isNaN(num) ? val : num }
      } else {
        newData[rowIdx] = { ...newData[rowIdx], [col]: val }
      }
      // Update main csv state
      setCsv(newData)
      return newData
    })
  }
  
  // Add row
  const addRow = () => {
    if (!prev || prev.length === 0) return
    const newRow = {}
    pC.forEach(col => {
      const varDef = dvars.find(v => v.name === col)
      newRow[col] = varDef?.type === "number" ? 0 : ""
    })
    const newData = [...prev, newRow]
    setPrev(newData)
    setCsv(newData)
  }
  
  // Delete row
  const delRow = (idx) => {
    const newData = prev.filter((_, i) => i !== idx)
    setPrev(newData)
    setCsv(newData)
  }

  const onUp = e => {
    const f = e.target.files[0]; if (!f) return
    Papa.parse(f, { 
      header: true, 
      dynamicTyping: false, // Keep everything as strings initially to detect types properly
      skipEmptyLines: true, 
      complete: ({ data }) => {
        // Detect column types from the data
        const cols = Object.keys(data[0] || {})
        const newDvars = cols.map((colName, idx) => {
          const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined && v !== "")
          
          // Try to detect if it's numeric
          const numericValues = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v))
          const isNumeric = numericValues.length === values.length && values.length > 0
          
          // Also check uniqueness - if very few unique values, likely categorical
          const uniqueCount = new Set(values).size
          const isCategorical = uniqueCount < Math.min(10, values.length * 0.5) // Less than 10 unique OR less than 50% unique
          
          if (isNumeric && !isCategorical) {
            // Numeric column - convert values to numbers
            const nums = values.map(v => parseFloat(v))
            const min = Math.min(...nums)
            const max = Math.max(...nums)
            
            // Convert the data values to actual numbers
            data.forEach(row => {
              if (row[colName] !== null && row[colName] !== undefined && row[colName] !== "") {
                row[colName] = parseFloat(row[colName])
              }
            })
            
            return { id: mkId(), name: colName, type: "number", min, max, options: "" }
          } else {
            // Categorical column - keep as strings
            const uniqueVals = [...new Set(values)]
            const options = uniqueVals.join(",")
            // Generate random colors for each option
            const colors = uniqueVals.map(() => generateRandomColor()).join(",")
            return { id: mkId(), name: colName, type: "category", options, colors }
          }
        })
        
        setDV(newDvars)
        push(data)
      }
    })
  }

  const downloadBlankTemplate = () => {
    // Get column names from dvars
    const columnNames = dvars.map(v => v.name.trim()).filter(Boolean)
    if (columnNames.length === 0) return
    
    // Create CSV with headers only
    const header = columnNames.join(",")
    const blankRow = columnNames.map(() => "").join(",")
    const csvContent = [header, blankRow].join("\n")
    
    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `template_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left side: Column configuration */}
      <div style={{ width: 420, flexShrink: 0, overflowY: "auto", padding: "28px 24px", borderRight: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: "'Caveat',cursive", fontSize: 26, fontWeight: 700, color: T.accent, marginBottom: 4 }}>① load data</div>
        <div style={{ fontSize: 14, color: T.muted, marginBottom: 20 }}>generate a sample dataset or upload your own CSV</div>

        <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 5, overflow: "hidden", marginBottom: 16, width: 210 }}>
          {["sample", "upload"].map(s => (
            <button key={s} onClick={() => setSrc(s)} style={{ flex: 1, padding: "7px 0", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", background: src === s ? T.accent : "transparent", color: src === s ? "#fff" : T.muted, border: "none", borderRight: s === "sample" ? `1px solid ${T.border}` : "none", cursor: "pointer", fontFamily: "'Courier Prime',monospace" }}>
            {s}
          </button>
        ))}
      </div>

      {src === "sample" && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {PRESETS.map(p => (
              <button key={p.name} onClick={() => { setDV(p.vars.map((v, i) => ({ ...v, id: i + mkId() }))); setNR(p.numRows); setPrev(null) }}
                style={{ padding: "5px 11px", borderRadius: 3, fontSize: 12, cursor: "pointer", background: T.p2, color: T.mid, border: `1px solid ${T.border}`, fontFamily: "'Courier Prime',monospace" }}>
                {p.emoji} {p.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Lbl>rows</Lbl>
            <input type="number" min={1} max={30} value={nRows} onChange={e => setNR(Math.max(1, Math.min(30, +e.target.value)))} style={{ ...inp, width: 52, marginBottom: 0 }}/>
          </div>

          <Lbl>columns</Lbl>
          {dvars.map((v, i) => {
            const opts = v.type === "category" ? v.options.split(",").map(s => s.trim()).filter(Boolean) : []
            const cols = v.type === "category" ? (v.colors || "").split(",").map(s => s.trim()).filter(Boolean) : []
            
            return (
              <div key={v.id} style={{ marginBottom: 10, padding: "8px", background: T.p1, borderRadius: 4, border: `1px solid ${T.ghost}` }}>
                <div style={{ display: "flex", gap: 6, marginBottom: v.type === "category" && opts.length > 0 ? 8 : 0, alignItems: "center" }}>
                  <input value={v.name} onChange={e => upd(v.id, "name", e.target.value)} placeholder={`col ${i + 1}`} style={{ ...inp, width: 90, minWidth: 0 }}/>
                  <select value={v.type} onChange={e => upd(v.id, "type", e.target.value)} style={inp}>
                    <option value="number">num</option>
                    <option value="category">cat</option>
                  </select>
                  {v.type === "number"
                    ? <>
                        <span style={{ fontSize: 12, color: T.muted }}>min</span>
                        <input value={v.min} onChange={e => upd(v.id, "min", e.target.value)} style={{ ...inp, width: 38 }}/>
                        <span style={{ fontSize: 12, color: T.muted }}>max</span>
                        <input value={v.max} onChange={e => upd(v.id, "max", e.target.value)} style={{ ...inp, width: 38 }}/>
                      </>
                    : <input value={v.options} onChange={e => upd(v.id, "options", e.target.value)} placeholder="a,b,c…" style={{ ...inp, flex: 1, minWidth: 0 }}/>
                  }
                  <button onClick={() => setDV(p => p.filter(x => x.id !== v.id))} style={{ background: "none", border: "none", fontSize: 13, color: T.ghost, cursor: "pointer" }}>✕</button>
                </div>
                
                {/* Category color pickers */}
                {v.type === "category" && opts.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 4 }}>
                    {opts.map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", padding: "3px 6px", borderRadius: 3, border: `1px solid ${T.ghost}` }}>
                        <input 
                          type="color" 
                          value={cols[oi] || "#888888"} 
                          onChange={e => {
                            const newCols = [...cols]
                            while (newCols.length < opts.length) newCols.push("#888888")
                            newCols[oi] = e.target.value
                            upd(v.id, "colors", newCols.join(","))
                          }}
                          style={{ width: 20, height: 20, border: "none", cursor: "pointer", borderRadius: 2 }}
                        />
                        <span style={{ fontSize: 11, color: T.mid }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <button
            onClick={() => setDV(p => [...p, { id: mkId(), name: "", type: "number", min: 0, max: 10, options: "" }])}
            style={{ width: "100%", padding: "5px 0", fontSize: 11, background: "transparent", color: T.mid, border: `1px dashed ${T.border}`, borderRadius: 3, cursor: "pointer", fontFamily: "'Courier Prime',monospace", marginBottom: 12 }}
          >
            + column
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => push(genData(dvars, nRows))}
              style={{ flex: 1, padding: "9px 0", borderRadius: 4, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontFamily: "'Caveat',cursive", fontSize: 16, fontWeight: 700 }}
            >
              generate ↺
            </button>
            <button
              onClick={downloadBlankTemplate}
              disabled={dvars.filter(v => v.name.trim()).length === 0}
              style={{ 
                padding: "9px 14px", 
                borderRadius: 4, 
                border: `1px solid ${T.ghost}`, 
                background: "#fff", 
                color: T.mid, 
                cursor: dvars.filter(v => v.name.trim()).length === 0 ? "not-allowed" : "pointer", 
                fontFamily: "'Courier Prime',monospace", 
                fontSize: 11,
                opacity: dvars.filter(v => v.name.trim()).length === 0 ? 0.5 : 1
              }}
              title="Download blank CSV template with these column names"
            >
              📄 blank
            </button>
          </div>
        </>
      )}

      {src === "upload" && (
        <div>
          <Lbl>csv file</Lbl>
          <input type="file" accept=".csv" onChange={onUp} style={{ fontSize: 13, color: T.mid }}/>
        </div>
      )}

      </div>

      {/* Right side: Editable data table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
        {prev?.length > 0 ? (
          <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "'Caveat',cursive", fontSize: 20, fontWeight: 700, color: T.accent, marginBottom: 2 }}>data table</div>
                <div style={{ fontSize: 12, color: T.muted }}>{prev.length} rows · {pC.length} columns</div>
              </div>
              <button onClick={addRow} style={{ padding: "6px 12px", borderRadius: 4, border: `1px solid ${T.accent}`, background: T.accent, color: "#fff", cursor: "pointer", fontFamily: "'Courier Prime',monospace", fontSize: 11 }}>
                + row
              </button>
            </div>

            <div style={{ overflowX: "auto", border: `1px solid ${T.ghost}`, borderRadius: 4 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.ghost, position: "sticky", top: 0, zIndex: 1 }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: T.mid, whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}`, width: 40 }}>#</th>
                    {pC.map(c => {
                      const varDef = dvars.find(v => v.name === c);
                      const typeLabel = varDef?.type === "number" ? "123" : varDef?.type === "date" ? "📅" : "abc";
                      return (
                        <th key={c} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: T.mid, whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>
                          {c} <span style={{ fontSize: 9, background: T.p1, padding: "1px 4px", borderRadius: 3, marginLeft: 4, color: T.muted }}>{typeLabel}</span>
                        </th>
                      );
                    })}
                    <th style={{ padding: "6px 8px", width: 40, borderBottom: `1px solid ${T.border}` }}></th>
                  </tr>
                </thead>
                <tbody>
                  {prev.map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? T.p1 : "transparent" }}>
                      <td style={{ padding: "4px 8px", color: T.muted, fontSize: 11, textAlign: "center" }}>{idx + 1}</td>
                      {pC.map(c => {
                        const varDef = dvars.find(v => v.name === c);
                        const isNum = varDef?.type === "number";
                        return (
                          <td key={c} style={{ padding: "2px 4px", whiteSpace: "nowrap" }}>
                            <input 
                              type={isNum ? "number" : "text"}
                              value={row[c] ?? ""}
                              onChange={e => updCell(idx, c, e.target.value)}
                              style={{ 
                                width: "100%", 
                                fontSize: 12, 
                                padding: "3px 6px", 
                                border: `1px solid ${T.ghost}`, 
                                borderRadius: 3,
                                background: "transparent",
                                color: isNum ? "#0066cc" : T.ink
                              }}
                            />
                          </td>
                        );
                      })}
                      <td style={{ padding: "4px 8px", textAlign: "center" }}>
                        <button 
                          onClick={() => delRow(idx)} 
                          title="Delete row"
                          style={{ 
                            fontSize: 14, 
                            background: "none", 
                            border: "none", 
                            color: T.muted, 
                            cursor: "pointer", 
                            padding: 0, 
                            lineHeight: 1,
                            opacity: 0.5
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14 }}>No data yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Generate sample data or upload a CSV to get started</div>
          </div>
        )}
      </div>
    </div>
  )
}
