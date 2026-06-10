// mockUsers.js
// 管理者与志愿者的 mock 数据（用于前端测试与展示）
export const mockManagers = [
  {
    id: 101,
    name: '管理员A',
    contact_number: '13900010001',
    lat: 28.676493,
    lng: 115.892151,
    role: '管理者',
    type: '社区管理',
    area: '东湖区'
  },
  {
    id: 102,
    name: '管理员B',
    contact_number: '13900010002',
    lat: 28.689000,
    lng: 115.900000,
    role: '管理者',
    type: '服务协调',
    area: '青山湖区'
  }
];

export const mockVolunteers = [
  {
    id: 201,
    name: '志愿者王',
    contact_number: '13800001111',
    lat: 28.678500,
    lng: 115.895500,
    role: '志愿者',
    type: '陪护',
    area: '东湖区'
  },
  {
    id: 202,
    name: '志愿者赵',
    contact_number: '13800002222',
    lat: 28.670000,
    lng: 115.885000,
    role: '志愿者',
    type: '送餐',
    area: '青云谱区'
  }
];