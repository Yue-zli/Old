// src/api/stat.js
// Axios API wrapper for backend /api/stat endpoints
import axios from 'axios';

const base = '/api/stat';  //接口前缀

async function getData(url, params = {}) {
  const res = await axios.get(url, { params });
  if (res && res.data) {
    if (res.data.code && res.data.code !== 200) {
      // 后端统一返回 {code,message,data}
      throw new Error(res.data.message || '后端返回错误');
    }
    return res.data.data ?? null;
  }
  throw new Error('无响应');
}

export async function statElderlyAge(breaks) {
  return getData(`${base}/elderly/age`, { breaks });
}

export async function statElderlyGender() {
  return getData(`${base}/elderly/gender`);
}

export async function statServiceType() {
  return getData(`${base}/service/type`);
}

export async function statServicePublishTime(timeType = '', startTime = '', endTime = '') {
  return getData(`${base}/service/publish-time`, { timeType, startTime, endTime });
}

// 列出所有服务订单（用于地图与需求者列表）
export async function listServiceOrders() {
  return getData(`${base}/service/list`);
}

// 订单详情
export async function getServiceOrderDetail(id) {
  const res = await axios.get(`${base}/service/detail`, { params: { id } });
  if (res && res.data) {
    if (res.data.code && res.data.code !== 200) throw new Error(res.data.message || '后端返回错误');
    return res.data.data ?? null;
  }
  throw new Error('无响应');
}

// 按老人ID查询订单
export async function listOrderByElderlyId(elderlyId) {
  return getData(`${base}/service/by-elderly`, { elderlyId });
}