import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import "./GanttChartD3.css"

const GanttChart = () => {
  const svgRef = useRef(null)
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null) // Track selected year

  useEffect(() => {
    if (!svgRef.current) return

    // Define the data with proper hierarchy and multiple phases
    const data = [
      {
        type: "customer",
        name: "BTDT - All",
        tasks: [
          { name: "BTDT: Serving Health & Welfare", start: "2025-07", end: "2025-12", phases: ["Strategy", "Plan"] },
          { name: "BTDT: Serve Circular, Pet, Coffee, Tea, Tubs", start: "2025-08", end: "2026-06", phases: ["Discover", "Develop"] },
          { name: "BTDT: Reuse Model", start: "2025-09", end: "2026-05", phases: ["Develop", "Deploy"] },
        ],
      },
      {
        type: "customer",
        name: "CLM - Contract Lifecycle Management",
        tasks: [
          { name: "CLM Model - Core (KPT) Wave 1", start: "2025-10", end: "2026-02", phases: ["Develop"] },
          { name: "CLM Model - Core (KPT) Wave 2", start: "2026-03", end: "2026-06", phases: ["Deploy"] },
          { name: "CLM Model - Core (KPT) Wave 3", start: "2026-04", end: "2026-09", phases: ["Deploy", "Hypercare"] },
          { name: "CLM Model - Core (KPT) Wave 4", start: "2026-07", end: "2027-01", phases: ["Hypercare"] },
          {
            name: "CLM Global Design",
            start: "2025-09",
            end: "2026-01",
            phases: ["Discover", "Develop"],
            milestones: [
              { date: "2025-10", type: "checkpoint" },
              { date: "2025-12", type: "checkpoint" },
            ],
          },
          { name: "CCNA Global Design", start: "2025-11", end: "2026-01", phases: ["Other"] },
        ],
      },
      {
        type: "customer",
        name: "EDNA - Enterprise Data Network Architecture",
        tasks: [
          { name: "EDNA Wave 0 Core", start: "2025-09", end: "2025-12", phases: ["Other"] },
          { name: "EDNA Wave 1", start: "2025-11", end: "2026-05", phases: ["Discover", "Develop"] },
          { name: "EDNA Wave 2", start: "2026-01", end: "2026-09", phases: ["Develop", "Deploy"] },
          { name: "EDNA Wave 3", start: "2026-04", end: "2027-03", phases: ["Deploy", "Hypercare"] },
        ],
      },
      {
        type: "transfer",
        name: "ECC - End-to-End Collaborative Commerce",
        tasks: [
          {
            name: "ECC Wave Phase 1 - Order Confirmation",
            start: "2025-09",
            end: "2026-08",
            phases: ["Develop", "Deploy"],
            milestones: [{ date: "2026-05", type: "checkpoint", label: "Go Live" }],
          },
          {
            name: "ECC Wave Phase 2 - Load Confirmation",
            start: "2026-05",
            end: "2027-01",
            phases: ["Deploy"],
            milestones: [{ date: "2026-12", type: "checkpoint", label: "Go Live" }],
          },
          { name: "ECC Wave Phase 3 - Negotiation Cycle", start: "2026-08", end: "2027-03", phases: ["Deploy", "Hypercare"] },
        ],
      },
      {
        type: "transfer",
        name: "FPO - Forecasting Planning & Ordering",
        tasks: [
          { name: "FPO - Centralize Tracker - Wave 1", start: "2025-08", end: "2025-12", phases: ["Discover"] },
          { name: "FPO - Centralize Tracker - Wave 2", start: "2025-10", end: "2026-02", phases: ["Develop"] },
          { name: "FPO - Centralize Tracker - Wave 3", start: "2026-01", end: "2026-07", phases: ["Deploy"] },
        ],
      },
    ]

    // Filter tasks to only show those that overlap with the selected year
    const filterTasksByYear = (tasks, year) => {
      if (!year) return tasks
      const yearStart = new Date(`${year}-01-01`)
      const yearEnd = new Date(`${year}-12-31`)
      return tasks.filter(task => {
        const taskStart = new Date(task.start)
        const taskEnd = new Date(task.end)
        return (taskStart <= yearEnd && taskEnd >= yearStart)
      })
    }

    // Filter milestones to only show those in the selected year
    const filterMilestonesByYear = (milestones, year) => {
      if (!year || !milestones) return milestones
      const yearStart = new Date(`${year}-01-01`)
      const yearEnd = new Date(`${year}-12-31`)
      return milestones.filter(milestone => {
        const milestoneDate = new Date(milestone.date)
        return (milestoneDate >= yearStart && milestoneDate <= yearEnd)
      })
    }

    // Process the data based on selected year
    const processedData = data.map(group => ({
      ...group,
      tasks: filterTasksByYear(group.tasks, selectedYear).map(task => ({
        ...task,
        milestones: filterMilestonesByYear(task.milestones, selectedYear)
      }))
    })).filter(group => group.tasks.length > 0) // Remove empty groups

    // Group processed data by type
    const groupedData = {
      customer: processedData.filter((item) => item.type === "customer"),
      transfer: processedData.filter((item) => item.type === "transfer"),
    }

    // Define colors for phases
    const phaseColor = {
      Strategy: "#d8bfd8", // Light purple
      Plan: "#ffa500", // Orange
      Discover: "#f0e68c", // Light yellow
      Develop: "#add8e6", // Light blue
      Deploy: "#90ee90", // Light green
      Adopt: "#ffb6c1", // Light pink
      Hypercare: "#c0c0c0", // Silver
      Other: "#e0e0e0", // Light gray
    }

    // Define status symbols
    const statusSymbols = {
      "Kick Off Ready": "●",
      "Deployment Ready": "◆",
      "Deployment Complete": "■",
      "Activation Complete": "★",
      Committed: "●",
      "Non Committed": "○",
      Other: "◯",
    }

    // Chart dimensions
    const width = 1000
    const headerHeight = 40
    const barHeight = 20
    const taskSpacing = 5 // Reduced spacing between tasks
    const taskNameWidth = 200 // Width for task names
    const leftColumnWidth = 70 // Width of the leftmost blue column
    const nameColumnWidth = 130 // Width of the category name column
    const margin = { top: 50, right: 200, bottom: 150, left: leftColumnWidth + nameColumnWidth + taskNameWidth }

    // Calculate total tasks for each category
    const calculateCategoryHeight = (category) => {
      return category.tasks.length * (barHeight + taskSpacing)
    }

    // Calculate total height for each group
    const calculateGroupHeight = (categories) => {
      return categories.reduce((acc, category) => acc + calculateCategoryHeight(category), 0)
    }

    // Calculate total height
    const customerHeight = calculateGroupHeight(groupedData.customer)
    const transferHeight = calculateGroupHeight(groupedData.transfer)
    const totalHeight = Math.max(
      margin.top + customerHeight + transferHeight + margin.bottom,
      margin.top + 400, // Minimum height to ensure legend fits
    )

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", totalHeight)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${totalHeight}`)
      .attr("style", "max-width: 100%; height: auto;")

    svg.selectAll("*").remove() // Clear previous renders

    // Set time scale domain based on selected year or full range
    const timeDomainStart = selectedYear ? new Date(`${selectedYear}-01-01`) : new Date("2025-01-01")
    const timeDomainEnd = selectedYear ? new Date(`${selectedYear}-12-31`) : new Date("2029-01-01")

    // Create a time scale for x-axis
    const timeScale = d3
      .scaleTime()
      .domain([timeDomainStart, timeDomainEnd])
      .range([margin.left, width + margin.left])

    // Add background for years (only if no year is selected)
    if (!selectedYear) {
      const years = [2025, 2026, 2027, 2028]
      years.forEach((year, i) => {
        const yearGroup = svg.append("g")
          .attr("cursor", "pointer")
          .on("click", () => setSelectedYear(year))

        yearGroup
          .append("rect")
          .attr("x", timeScale(new Date(`${year}-01-01`)))
          .attr("y", margin.top - headerHeight)
          .attr("width", timeScale(new Date(`${year + 1}-01-01`)) - timeScale(new Date(`${year}-01-01`)))
          .attr("height", headerHeight)
          .attr("fill", i % 2 === 0 ? "#555" : "#777")

        yearGroup
          .append("text")
          .attr("x", timeScale(new Date(`${year}-07-01`)))
          .attr("y", margin.top - headerHeight / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .attr("font-weight", "bold")
          .text(year)
      })
    } else {
      // Show "Back to all years" button when a year is selected
      const backButton = svg.append("g")
        .attr("cursor", "pointer")
        .on("click", () => setSelectedYear(null))
        .attr("transform", `translate(${margin.left}, ${margin.top - 30})`)

      backButton
        .append("rect")
        .attr("width", 120)
        .attr("height", 20)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", "#3498db")

      backButton
        .append("text")
        .attr("x", 60)
        .attr("y", 13)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("Back to all years")
    }

    // Add quarter backgrounds (always show for current view)
    const yearsToShow = selectedYear ? [selectedYear] : [2025, 2026, 2027, 2028]
    yearsToShow.forEach(year => {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const startMonth = (quarter - 1) * 3 + 1
        const startDate = new Date(`${year}-${startMonth.toString().padStart(2, "0")}-01`)
        const endMonth = quarter * 3
        const endDate = new Date(
          `${year}-${endMonth.toString().padStart(2, "0")}-${endMonth === 3 || endMonth === 6 || endMonth === 9 || endMonth === 12 ? "30" : "31"}`,
        )

        svg
          .append("rect")
          .attr("x", timeScale(startDate))
          .attr("y", margin.top)
          .attr("width", timeScale(endDate) - timeScale(startDate))
          .attr("height", totalHeight - margin.top - margin.bottom)
          .attr("fill", quarter % 2 === 0 ? "#f9f9f9" : "#f0f0f0")
          .attr("opacity", 0.5)
      }
    })

    // Add quarter labels
    yearsToShow.forEach(year => {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const startMonth = (quarter - 1) * 3 + 1
        const middleDate = new Date(`${year}-${(startMonth + 1).toString().padStart(2, "0")}-15`)

        svg
          .append("text")
          .attr("x", timeScale(middleDate))
          .attr("y", margin.top - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .text(`Q${quarter}`)
      }
    })

    // Draw vertical grid lines for quarters
    yearsToShow.forEach(year => {
      for (let quarter = 1; quarter <= 4; quarter++) {
        const startMonth = (quarter - 1) * 3 + 1
        const startDate = new Date(`${year}-${startMonth.toString().padStart(2, "0")}-01`)

        svg
          .append("line")
          .attr("x1", timeScale(startDate))
          .attr("y1", margin.top)
          .attr("x2", timeScale(startDate))
          .attr("y2", totalHeight - margin.bottom)
          .attr("stroke", "#ccc")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3,3")
      }
    })

    // Function to wrap text
    function wrapText(text, width) {
      text.each(function () {
        const text = d3.select(this)
        const words = text.text().split(/\s+/).reverse()
        let word
        let line = []
        let lineNumber = 0
        const lineHeight = 1.1 // ems
        const y = text.attr("y")
        const dy = Number.parseFloat(text.attr("dy") || 0)
        let tspan = text
          .text(null)
          .append("tspan")
          .attr("x", text.attr("x"))
          .attr("y", y)
          .attr("dy", dy + "em")

        while ((word = words.pop())) {
          line.push(word)
          tspan.text(line.join(" "))
          if (tspan.node().getComputedTextLength() > width) {
            line.pop()
            tspan.text(line.join(" "))
            line = [word]
            tspan = text
              .append("tspan")
              .attr("x", text.attr("x"))
              .attr("y", y)
              .attr("dy", ++lineNumber * lineHeight + dy + "em")
              .text(word)
          }
        }
      })
    }

    // Draw the main category columns and tasks
    let currentY = margin.top

    // Function to draw a group of categories
    const drawCategoryGroup = (groupName, categories) => {
      if (categories.length === 0) return // Skip empty groups

      // Calculate group height
      const groupHeight = calculateGroupHeight(categories)

      // Main blue column for the group
      svg
        .append("rect")
        .attr("x", 0)
        .attr("y", currentY)
        .attr("width", leftColumnWidth)
        .attr("height", groupHeight)
        .attr("fill", "#3498db")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)

      // Add group title (vertical text)
      svg
        .append("text")
        .attr("transform", `translate(${leftColumnWidth / 2}, ${currentY + groupHeight / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .attr("font-size", "14px")
        .text(groupName === "customer" ? "Customer" : "Transfer")

      // Draw each category in this group
      categories.forEach((category) => {
        const categoryHeight = calculateCategoryHeight(category)

        // Category blue column
        svg
          .append("rect")
          .attr("x", leftColumnWidth)
          .attr("y", currentY)
          .attr("width", nameColumnWidth)
          .attr("height", categoryHeight)
          .attr("fill", "#3498db")
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)

        // Add category name (centered)
        const categoryText = svg
          .append("text")
          .attr("x", leftColumnWidth + nameColumnWidth / 2)
          .attr("y", currentY + categoryHeight / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("fill", "white")
          .attr("font-weight", "bold")
          .attr("font-size", "12px")
          .text(category.name)

        // Wrap category name if needed
        if (category.name.length > 20) {
          categoryText.call(wrapText, nameColumnWidth - 10)
        }

        // Draw tasks for this category
        category.tasks.forEach((task, taskIndex) => {
          const taskY = currentY + taskIndex * (barHeight + taskSpacing)
          const startDate = new Date(task.start)
          const endDate = new Date(task.end)

          // Adjust dates to fit within selected year if needed
          const displayStart = selectedYear ? 
            Math.max(startDate, new Date(`${selectedYear}-01-01`)) : startDate
          const displayEnd = selectedYear ? 
            Math.min(endDate, new Date(`${selectedYear}-12-31`)) : endDate

          // Add white background for task name
          svg
            .append("rect")
            .attr("x", leftColumnWidth + nameColumnWidth)
            .attr("y", taskY)
            .attr("width", taskNameWidth)
            .attr("height", barHeight)
            .attr("fill", "white")
            .attr("stroke", "#eee")
            .attr("stroke-width", 1)

          // Task name in the white area with text wrapping
          const taskText = svg
            .append("text")
            .attr("x", leftColumnWidth + nameColumnWidth + 5)
            .attr("y", taskY + barHeight / 2)
            .attr("dy", ".35em")
            .attr("font-size", "11px")
            .text(task.name)

          // Truncate task name if too long
          const taskTextNode = taskText.node()
          if (taskTextNode && taskTextNode.getComputedTextLength() > taskNameWidth - 10) {
            let text = task.name
            while (text.length > 3 && taskTextNode.getComputedTextLength() > taskNameWidth - 15) {
              text = text.slice(0, -1)
              taskText.text(text + "...")
            }
          }

          // Determine if this task's bar should be visible based on selected phase
          const isVisible = !selectedPhase || task.phases.includes(selectedPhase)

          // Calculate bar segment width for multi-phase tasks
          const totalDuration = timeScale(displayEnd) - timeScale(displayStart)
          const segmentWidth = totalDuration / task.phases.length

          // Draw each phase segment of the task bar
          task.phases.forEach((phase, phaseIndex) => {
            const isPhaseVisible = !selectedPhase || phase === selectedPhase
            if (isPhaseVisible) {
              svg
                .append("rect")
                .attr("x", timeScale(displayStart) + phaseIndex * segmentWidth)
                .attr("y", taskY)
                .attr("width", segmentWidth)
                .attr("height", barHeight)
                .attr("fill", phaseColor[phase])
                .attr("rx", 3)
                .attr("ry", 3)
                .attr("stroke", "#888")
                .attr("stroke-width", 0.5)
            }
          })

          // Add milestones if any
          if (task.milestones && isVisible) {
            task.milestones.forEach((milestone) => {
              const milestoneDate = new Date(milestone.date)

              // Draw milestone marker
              svg
                .append("circle")
                .attr("cx", timeScale(milestoneDate))
                .attr("cy", taskY + barHeight / 2)
                .attr("r", 5)
                .attr("fill", "#333")

              // Add milestone label if provided
              if (milestone.label) {
                svg
                  .append("text")
                  .attr("x", timeScale(milestoneDate))
                  .attr("y", taskY + barHeight + 12)
                  .attr("text-anchor", "middle")
                  .attr("font-size", "8px")
                  .text(milestone.label)
              }
            })
          }
        })

        // Update current Y position
        currentY += categoryHeight
      })
    }

    // Draw customer categories
    drawCategoryGroup("customer", groupedData.customer)

    // Draw transfer categories
    drawCategoryGroup("transfer", groupedData.transfer)

    // Add phases legend on the right side
    const phasesLegendX = width + margin.left + 20
    const phasesLegendY = margin.top

    // Add "Phases" header
    svg
      .append("text")
      .attr("x", phasesLegendX)
      .attr("y", phasesLegendY - 10)
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .text("Phases")

    // Define phases in order
    const phases = ["Strategy", "Plan", "Discover", "Develop", "Deploy", "Adopt", "Hypercare", "Other"]

    // Add phase boxes and labels with click handlers
    phases.forEach((phase, i) => {
      const isSelected = selectedPhase === phase
      const group = svg
        .append("g")
        .attr("cursor", "pointer")
        .on("click", () => {
          // Toggle selection
          if (selectedPhase === phase) {
            setSelectedPhase(null) // Deselect if already selected
          } else {
            setSelectedPhase(phase) // Select this phase
          }
        })

      // Phase box
      group
        .append("rect")
        .attr("x", phasesLegendX)
        .attr("y", phasesLegendY + i * 25)
        .attr("width", 120)
        .attr("height", 20)
        .attr("fill", phaseColor[phase])
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("stroke", isSelected ? "#000" : "#888")
        .attr("stroke-width", isSelected ? 2 : 0.5)

      // Phase label
      group
        .append("text")
        .attr("x", phasesLegendX + 60)
        .attr("y", phasesLegendY + i * 25 + 14)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", isSelected ? "bold" : "normal")
        .text(phase)

      // Add selection indicator if selected
      if (isSelected) {
        group
          .append("text")
          .attr("x", phasesLegendX - 15)
          .attr("y", phasesLegendY + i * 25 + 14)
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .text("✓")
      }
    })

    // Add "Status to Watch" section
    const statusY = phasesLegendY + phases.length * 25 + 30

    svg
      .append("text")
      .attr("x", phasesLegendX)
      .attr("y", statusY)
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .text("Status to Watch")

    // Add "Potential Market Start" subsection
    svg
      .append("text")
      .attr("x", phasesLegendX)
      .attr("y", statusY + 25)
      .attr("font-size", "11px")
      .text("Potential Market Start")

    // Add plus icon
    svg
      .append("text")
      .attr("x", phasesLegendX - 15)
      .attr("y", statusY + 25)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("+")

    // Add "Market Deployment" subsection
    svg
      .append("text")
      .attr("x", phasesLegendX)
      .attr("y", statusY + 50)
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .text("Market Deployment")

    // Status indicators for Market Deployment
    const deploymentStatuses = [
      "Kick Off Ready",
      "Deployment Ready",
      "Deployment Complete",
      "Activation Complete",
      "Other",
    ]
    deploymentStatuses.forEach((status, i) => {
      // Symbol
      svg
        .append("text")
        .attr("x", phasesLegendX)
        .attr("y", statusY + 75 + i * 20)
        .attr("font-size", "16px")
        .text(statusSymbols[status])

      // Label
      svg
        .append("text")
        .attr("x", phasesLegendX + 25)
        .attr("y", statusY + 75 + i * 20)
        .attr("font-size", "11px")
        .text(status)
    })

    // Add "Market Commitment" section
    const commitmentY = statusY + 75 + deploymentStatuses.length * 20 + 20

    svg
      .append("text")
      .attr("x", phasesLegendX)
      .attr("y", commitmentY)
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .text("Market Commitment")

    // Commitment indicators
    const commitments = ["Committed", "Non Committed"]
    commitments.forEach((commitment, i) => {
      // Symbol
      svg
        .append("text")
        .attr("x", phasesLegendX)
        .attr("y", commitmentY + 25 + i * 20)
        .attr("font-size", "16px")
        .attr("fill", commitment === "Committed" ? "#000" : "#000")
        .text(statusSymbols[commitment])

      // Label
      svg
        .append("text")
        .attr("x", phasesLegendX + 25)
        .attr("y", commitmentY + 25 + i * 20)
        .attr("font-size", "11px")
        .text(commitment)
    })
  }, [selectedPhase, selectedYear]) // Re-render when selectedPhase or selectedYear changes

  return (
    <div className="gantt-chart-container">
      <svg ref={svgRef} className="gantt-chart"></svg>
    </div>
  )
}

export default GanttChart