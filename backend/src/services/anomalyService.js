export const buildAnomalySignals = ({ topActions, topEntities, currentPeriodTotal, previousPeriodTotal, deltaPct }) => {
  const anomalies = [];

  const actionTotal = topActions.reduce((acc, item) => acc + item.total, 0);
  if (actionTotal > 0) {
    const dominantAction = topActions[0];
    const dominantActionShare = Number(((dominantAction.total / actionTotal) * 100).toFixed(2));
    if (dominantActionShare >= 55) {
      anomalies.push({
        type: "action_concentration",
        risk: dominantActionShare >= 75 ? "high" : "medium",
        title: "Concentración de acciones",
        description: `La acción "${dominantAction._id}" representa ${dominantActionShare}% del volumen auditado.`
      });
    }
  }

  const entityTotal = topEntities.reduce((acc, item) => acc + item.total, 0);
  if (entityTotal > 0) {
    const dominantEntity = topEntities[0];
    const dominantEntityShare = Number(((dominantEntity.total / entityTotal) * 100).toFixed(2));
    if (dominantEntityShare >= 60) {
      anomalies.push({
        type: "entity_concentration",
        risk: dominantEntityShare >= 80 ? "high" : "medium",
        title: "Concentración por entidad",
        description: `La entidad "${dominantEntity._id}" concentra ${dominantEntityShare}% de eventos.`
      });
    }
  }

  if (previousPeriodTotal > 0 && deltaPct >= 40) {
    anomalies.push({
      type: "volume_spike",
      risk: deltaPct >= 100 ? "high" : "medium",
      title: "Pico de actividad",
      description: `El volumen creció ${deltaPct}% respecto al periodo anterior.`
    });
  }

  if (previousPeriodTotal === 0 && currentPeriodTotal >= 50) {
    anomalies.push({
      type: "new_high_volume",
      risk: "medium",
      title: "Alta actividad sin histórico",
      description: "Se detecta volumen alto sin baseline previo para comparación."
    });
  }

  return anomalies;
};
