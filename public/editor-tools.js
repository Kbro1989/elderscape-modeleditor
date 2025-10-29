window.EditorTools = {
  init(viewer) {
    const container = document.createElement("div");
    container.className = "ai-editor-panel";
    container.innerHTML = `
      <textarea id="aiPrompt" placeholder="Describe your edit (e.g., make dragon red with lava glow)..."></textarea>
      <button id="applyAIEdit">Apply AI Edit</button>
    `;
    document.body.appendChild(container);

    document.getElementById("applyAIEdit").onclick = async () => {
      const prompt = document.getElementById("aiPrompt").value;
      const modelData = viewer.getCurrentModelData();
      const response = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: modelData })
      });
      const result = await response.json();
      viewer.applyEdits(result);
    };
  }
};
