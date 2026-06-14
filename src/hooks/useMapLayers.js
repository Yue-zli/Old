// useMapLayers.js — 环境图层渲染引擎
// 从 ConvergeAnalysis.vue 提取：医院/公园/地铁/道路四要素的 AMap 图层
// 接收 map + 数据 + marker 数组，直接操作 AMap 对象

/**
 * 渲染全部环境图层（医院/公园/地铁/道路）
 * 仅在首次调用时执行（内部 marker 数组非空时跳过）
 */
export function renderEnvironmentLayers({
  map, infoWindow, turf,
  facilityData, parkFeatures, transitFeatures, nimbyFeatures,
  facilityMarkers, parkMarkers, transitMarkers, nimbyMarkers, transitPolygons,
  layerVisibility
}) {
  if (!map) return;

  // 防止重复创建
  if (parkMarkers.length > 0 || transitMarkers.length > 0 || nimbyMarkers.length > 0) {
    return;
  }

  // ===== 0. 医疗设施：三级分级 + 200m 聚类 =====
  if (facilityData && facilityMarkers.length === 0) {
    const getTier = (type) => {
      if (!type) return 3;
      if (type.includes('三级甲等')) return 1;
      if (type.includes('综合医院')) return 2;
      return 3;
    };

    // 200m 内聚类
    const dist = (a, b) => {
      const dx = (a.lng - b.lng) * 111320 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180);
      const dy = (a.lat - b.lat) * 111320;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const clusters = [];
    facilityData.forEach(item => {
      let found = false;
      for (const c of clusters) {
        if (dist(item, c.rep) < 200) { c.members.push(item); found = true; break; }
      }
      if (!found) clusters.push({ rep: item, members: [item] });
    });

    clusters.forEach(cluster => {
      const bestTier = Math.min(...cluster.members.map(m => getTier(m.type)));
      const names = cluster.members.map(m =>
        m.name.replace(/[\(\（][^)）]*[\)\）]/g, '').trim()
      );
      const mainName = names.reduce((a, b) => a.length <= b.length ? a : b);
      const extraCount = cluster.members.length - 1;
      const tooltip = extraCount > 0
        ? `${mainName} + ${extraCount}个附属设施\n${cluster.members.map(m => '  ' + m.name).join('\n')}`
        : cluster.members[0].name;

      const config = bestTier === 1
        ? { radius: 6, fillColor: '#06b6d4', opacity: 1.0, zIndex: 125 }
        : bestTier === 2
        ? { radius: 4, fillColor: '#0ea5e9', opacity: 0.85, zIndex: 120 }
        : { radius: 2.5, fillColor: '#64748b', opacity: 0.7, zIndex: 115 };

      const rep = cluster.rep;
      const dot = new AMap.CircleMarker({
        center: [rep.lng, rep.lat], radius: config.radius,
        fillColor: config.fillColor, fillOpacity: config.opacity,
        strokeColor: bestTier === 1 ? '#fff' : '#020617',
        strokeWeight: bestTier === 1 ? 2 : 0.5,
        zIndex: config.zIndex, title: tooltip
      });

      // 点击查周边
      dot.on('click', () => {
        const nearbyParks = [];
        const nearbyStations = new Set();
        if (parkFeatures?.features) {
          parkFeatures.features.forEach(p => {
            const d = turf.distance(turf.point([rep.lng, rep.lat]), p, { units: 'kilometers' });
            if (d <= 1) nearbyParks.push({ name: p.properties.name, dist: d });
          });
        }
        if (transitFeatures?.features) {
          transitFeatures.features.forEach(t => {
            const d = turf.distance(turf.point([rep.lng, rep.lat]), t, { units: 'kilometers' });
            if (d <= 1) {
              let sn = (t.properties.name || '')
                .replace(/[\(\（][^)）]*[\)\）]/g, '')
                .replace(/地铁站|出入口|\d+号口|[A-Z]口|[南北东西]口/g, '')
                .replace(/·.+$/, '').trim();
              if (sn) nearbyStations.add(sn);
            }
          });
        }
        const tierName = bestTier === 1 ? '三级甲等' : bestTier === 2 ? '综合医院' : '专科/其他';
        const membersHTML = cluster.members.length > 1
          ? `<div style="font-size:10px;color:#64748b;margin-bottom:4px">含：${cluster.members.map(m => m.name).join('、')}</div>` : '';
        const parkList = nearbyParks.length > 0
          ? nearbyParks.sort((a,b) => a.dist - b.dist).slice(0,5).map(p => `<div>🌳 ${p.name} (${(p.dist*1000).toFixed(0)}m)</div>`).join('')
          : '<div style="color:#64748b">1km内无公园</div>';
        const stationList = nearbyStations.size > 0
          ? [...nearbyStations].slice(0,5).map(s => `<div>🚇 ${s}</div>`).join('')
          : '<div style="color:#64748b">1km内无地铁站</div>';
        infoWindow.setContent(`
          <div class="custom-info-window" style="min-width:280px">
            <div style="font-size:14px;font-weight:bold;color:#06b6d4;margin-bottom:2px">🏥 ${mainName}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">${tierName}${extraCount > 0 ? ` · 共${cluster.members.length}个设施` : ''}</div>
            ${membersHTML}
            <div style="border-top:1px solid rgba(59,130,246,0.2);padding-top:6px;font-size:12px;line-height:1.8">
              <div style="color:#10b981;font-weight:bold;margin-bottom:2px">🌳 周边公园</div>${parkList}
              <div style="color:#38bdf8;font-weight:bold;margin-top:6px;margin-bottom:2px">🚇 周边地铁站</div>${stationList}
            </div>
          </div>`);
        infoWindow.open(map, [rep.lng, rep.lat]);
      });

      dot._tier = bestTier;
      dot.setMap(map);
      facilityMarkers.push(dot);

      if (bestTier === 1) {
        const label = new AMap.Text({
          text: mainName.length > 8 ? mainName.slice(0, 8) + '...' : mainName,
          position: [rep.lng, rep.lat], offset: new AMap.Pixel(10, -10),
          style: {
            'font-size':'9px','color':'#cffafe','background-color':'rgba(0,0,0,0.6)',
            'border-color':'#06b6d4','border-width':'1px','border-style':'solid',
            'border-radius':'2px','padding':'1px 4px'
          }, zIndex: 126
        });
        label._tier = bestTier;
        label.setMap(map);
        facilityMarkers.push(label);
      }
    });
  }

  // ===== 1. 公园 =====
  if (parkFeatures?.features) {
    parkFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates;
      const marker = new AMap.Marker({
        position: [lng, lat],
        content: '<div style="width:10px;height:10px;background:#10b981;border:2px solid #fff;display:inline-block;font-size:0;line-height:0;vertical-align:top;" title="' + (item.properties.name || '') + '"></div>',
        offset: new AMap.Pixel(-6, -6), zIndex: 91
      });
      marker.setMap(map);
      parkMarkers.push(marker);
    });
  }

  // ===== 2. 地铁：按站聚合为服务区面 =====
  if (transitFeatures?.features) {
    const stationGroups = {};
    transitFeatures.features.forEach(item => {
      const [lng, lat] = item.geometry.coordinates;
      let baseName = (item.properties.name || '')
        .replace(/[\(\（][^)）]*[\)\）]/g, '')
        .replace(/地铁站/g, '').replace(/·.+$/, '')
        .replace(/\d+号口|[A-Z]口|[南北东西]口/g, '')
        .replace(/出入口/g, '').replace(/地铁$/, '').trim();
      if (!baseName.endsWith('站')) baseName += '站';
      if (!stationGroups[baseName]) stationGroups[baseName] = [];
      stationGroups[baseName].push([lng, lat]);
    });

    Object.entries(stationGroups).forEach(([stationName, coords]) => {
      const exitCount = coords.length;
      let bufferKm = exitCount >= 4 ? 0.4 : exitCount >= 2 ? 0.35 : 0.3;

      let serviceArea;
      if (coords.length >= 2) {
        try {
          const hull = turf.convex(turf.featureCollection(coords.map(c => turf.point(c))));
          if (hull) serviceArea = turf.buffer(hull, bufferKm, { units: 'kilometers' });
        } catch (e) {}
      }
      if (!serviceArea) {
        serviceArea = turf.buffer(turf.point(coords[0]), bufferKm, { units: 'kilometers' });
      }

      transitPolygons.push(serviceArea);

      try {
        const polygon = new AMap.Polygon({
          path: serviceArea.geometry.coordinates[0],
          fillColor: '#38bdf8', fillOpacity: 0.08,
          strokeColor: '#38bdf8', strokeWeight: 1, strokeOpacity: 0.5,
          strokeStyle: 'dashed', zIndex: 55, bubble: true
        });
        polygon.setMap(map);
        transitMarkers.push(polygon);

        const center = turf.center(serviceArea).geometry.coordinates;
        const label = new AMap.Text({
          text: stationName.replace('站', ''),
          position: [center[0], center[1]],
          style: {
            'background-color':'rgba(15,23,42,0.8)','border-color':'#38bdf8',
            'border-width':'1px','border-style':'solid','border-radius':'3px',
            'padding':'2px 6px','font-size':'10px','color':'#bae6fd','text-align':'center'
          }, zIndex: 110
        });
        label.setMap(map);
        transitMarkers.push(label);
      } catch (e) {}
    });
  }

  // ===== 3. 道路环境影响带 =====
  if (nimbyFeatures?.features) {
    const roadGroups = {};
    nimbyFeatures.features.forEach(item => {
      const roadName = (item.properties.name || '').split(/出口|入口|与|交叉口/)[0].trim();
      if (!roadName) return;
      if (!roadGroups[roadName]) roadGroups[roadName] = [];
      roadGroups[roadName].push(item.geometry.coordinates);
    });

    Object.entries(roadGroups).forEach(([roadName, coords]) => {
      if (coords.length >= 2) {
        coords.sort((a, b) => a[0] - b[0]);
        try {
          const buffer = turf.buffer(turf.lineString(coords), 0.3, { units: 'kilometers' });
          const polygon = new AMap.Polygon({
            path: buffer.geometry.coordinates[0],
            fillColor: '#ef4444', fillOpacity: 0.08,
            strokeColor: '#ef4444', strokeWeight: 1, strokeOpacity: 0.4,
            strokeStyle: 'dashed', zIndex: 50, bubble: true
          });
          polygon.setMap(map);
          nimbyMarkers.push(polygon);
        } catch (e) {}
      } else {
        const [lng, lat] = coords[0];
        const marker = new AMap.Marker({
          position: [lng, lat],
          content: '<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #ef4444;font-size:0;line-height:0;" title="' + roadName + '"></div>',
          offset: new AMap.Pixel(-5, -10), zIndex: 85
        });
        marker.setMap(map);
        nimbyMarkers.push(marker);
      }
    });
  }

  // 初始显隐：按工具栏默认状态
  parkMarkers.forEach(m => layerVisibility.value.parks ? m.show() : m.hide());
  transitMarkers.forEach(m => layerVisibility.value.transits ? m.show() : m.hide());
  nimbyMarkers.forEach(m => layerVisibility.value.nimbys ? m.show() : m.hide());
}
