// Authored geometric SVGs: a shared 24×24 canvas inherits the app's 1.7px rounded stroke.
// IDs are stable data values, independent from localized names or picker grouping.
const extraCategoryIcons = {
  fruit: [
    '水果',
    '<path d="M12 7c-6-5-11 1-7 9 3 6 5 4 7 4s4 2 7-4c4-8-1-14-7-9Zm0 0V3m0 2c1-3 3-3 5-3"/>',
  ],
  cake: [
    '甜点',
    '<path d="M4 12h16v9H4Zm0 4c2-3 4 3 6 0s4 3 6 0 3 0 4 0M12 12V8"/><path d="M12 2c-3 3-2 5 0 5s3-2 0-5Z"/>',
  ],
  bottle: ['饮料', '<path d="M9 2h6v4l2 4v10H7V10l2-4V2Zm0 4h6M7 12h10m-10 5h10"/>'],
  noodles: [
    '面食',
    '<path d="M3 12h18c-1 6-4 8-9 8s-8-2-9-8Zm5 9h8M6 3l14 5M5 6l14 5M8 9v3m4-2v2"/>',
  ],
  car: ['汽车', '<path d="m5 9 2-5h10l2 5M3 10h18v8H3Zm2 8v3m14-3v3M6 13h2m8 0h2"/>'],
  bus: [
    '公交',
    '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 11h16M12 3v8M7 19v2m10-2v2M7 15h1m8 0h1"/>',
  ],
  bike: [
    '骑行',
    '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-9 5 9H5m10 0 4-9h-7M8 5h4m6-2h2l1 5"/>',
  ],
  plane: ['机票', '<path d="m12 2 2 8 7 5v2l-7-2v5l2 2-4-1-4 1 2-2v-5l-7 2v-2l7-5 2-8Z"/>'],
  fuel: [
    '加油',
    '<path d="M4 21V4h10v17M2 21h14M4 10h10m0 3h3v5a2 2 0 0 0 4 0V8l-3-3m1 1-2 2 4 3"/>',
  ],
  shirt: ['服饰', '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c-1 4-7 4-8 0Z"/>'],
  shoe: ['鞋靴', '<path d="M3 8h5l3 6 9 2 1 5H3V8Zm0 10h18M9 10l3-1m-1 4 3-1"/>'],
  gift: [
    '礼物',
    '<path d="M3 10h18v4H3Zm2 4v7h14v-7M12 10v11"/><path d="M12 10C2 10 4 1 8 4l4 6c10 0 8-9 4-6l-4 6Z"/>',
  ],
  phone: ['数码', '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>'],
  cart: [
    '日用品',
    '<path d="M2 3h3l3 12h11l3-9H6m2 9-1 3h12"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/>',
  ],
  home: ['住房', '<path d="m2 11 10-9 10 9M5 9v12h14V9M9 21v-8h6v8"/>'],
  key: ['房租', '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3M7 7h1"/>'],
  bulb: [
    '电费',
    '<path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7H8Zm1 3h6m-5 3h4m-2-6v-5"/>',
  ],
  wifi: [
    '网络',
    '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
  ],
  tools: ['维修', '<path d="M14 3a6 6 0 0 0-7 8L2 18l4 4 7-8a6 6 0 0 0 8-7l-4 4-4-4 4-4h-3Z"/>'],
  pill: ['药品', '<path d="m5 11 6-6a5.7 5.7 0 0 1 8 8l-6 6a5.7 5.7 0 0 1-8-8Zm3-3 8 8"/>'],
  clinic: ['就医', '<path d="M4 21V5h16v16M2 21h20M9 21v-5h6v5M12 7v6m-3-3h6"/>'],
  tooth: ['牙科', '<path d="M12 5C2-3 2 10 5 15l2 7 3-8h4l3 8 2-7c3-5 3-18-7-10Z"/>'],
  pet: [
    '宠物',
    '<ellipse cx="5" cy="8" rx="2" ry="3"/><ellipse cx="11" cy="5" rx="2" ry="3"/><ellipse cx="18" cy="7" rx="2" ry="3"/><path d="M8 14c2-5 6-5 8 0 6 4 2 8-4 5-6 3-10-1-4-5Z"/>',
  ],
  movie: [
    '电影',
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
  ],
  music: [
    '音乐',
    '<path d="M9 17V5l11-3v13M9 9l11-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  ],
  game: [
    '游戏',
    '<path d="M7 6h10c4 0 7 14 3 14l-5-4H9l-5 4C0 20 3 6 7 6Z"/><path d="M7 9v6m-3-3h6m6-2h1m1 3h1"/>',
  ],
  coins: [
    '现金',
    '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 4 12 4 12 0V6M3 11v5c0 3 6 4 10 2"/><path d="M16 11c7 0 7 5 0 5m5-3v6c0 3-9 3-9 0v-5"/>',
  ],
  bank: ['银行', '<path d="m2 8 10-6 10 6H2Zm1 13h18M5 11v7m7-7v7m7-7v7"/>'],
  card: ['银行卡', '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h4"/>'],
  salary: [
    '工资',
    '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V3h8v3M3 12c6 3 12 3 18 0m-11 2h4"/>',
  ],
  bonus: ['奖励', '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>'],
}
const categoryIconGroups = {
  common: {
    label: '常用',
    ids: ['food', 'coffee', 'transit', 'bag', 'pay', 'book', 'timer', 'activity', 'heart', 'leaf'],
  },
  dining: { label: '餐饮', ids: ['food', 'coffee', 'fruit', 'cake', 'bottle', 'noodles'] },
  travel: { label: '交通出行', ids: ['transit', 'car', 'bus', 'bike', 'plane', 'fuel'] },
  shopping: { label: '购物消费', ids: ['bag', 'shirt', 'shoe', 'gift', 'phone', 'cart'] },
  living: { label: '居家缴费', ids: ['home', 'key', 'bulb', 'drop', 'wifi', 'tools'] },
  health: { label: '健康宠物', ids: ['heart', 'activity', 'pill', 'clinic', 'tooth', 'pet'] },
  leisure: { label: '学习娱乐', ids: ['book', 'timer', 'leaf', 'movie', 'music', 'game'] },
  income: { label: '收入财务', ids: ['pay', 'coins', 'bank', 'card', 'salary', 'bonus'] },
}
console.info('[G4 icons]', 'library-ready')
