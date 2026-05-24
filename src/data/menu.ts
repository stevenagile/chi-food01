export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  popular?: boolean;
  options?: MenuOption[];
}

export interface MenuOption {
  name: string;
  choices: { label: string; priceAdd: number }[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: Record<string, string>;
  note?: string;
}

export interface Order {
  id: string;
  tableNumber?: string;
  type: '內用' | '外帶';
  items: CartItem[];
  total: number;
  status: '待確認' | '製作中' | '已完成' | '已取消';
  createdAt: Date;
  customerName?: string;
  customerPhone?: string;
  paymentStatus: '未付款' | '已付款';
  paymentMethod?: '現金' | '掃碼支付' | null;
  paidAt?: Date | null;
  guestCount?: number | null;
  cookingAt?: Date | null;
  completedAt?: Date | null;
}

export const categories = [
  { id: 'platter', name: '切盤', icon: '🍗' },
  { id: 'rice', name: '飯類', icon: '🍚' },
  { id: 'side', name: '小菜', icon: '🥬' },
  { id: 'drink', name: '飲品', icon: '🍵' },
  { id: 'weekend', name: '假日限定', icon: '🎉' },
];

// --- 切盤 ---

const chickenSizeOptions: MenuOption = {
  name: '部位',
  choices: [
    { label: '脾(腿)', priceAdd: 0 },
    { label: '上庄', priceAdd: 90 },
    { label: '下庄', priceAdd: 140 },
    { label: '半圈', priceAdd: 370 },
    { label: '原隻', priceAdd: 730 },
  ],
};

const soyChickenSizeOptions: MenuOption = {
  name: '部位',
  choices: [
    { label: '脾(腿)', priceAdd: 0 },
    { label: '上庄', priceAdd: 100 },
    { label: '下庄', priceAdd: 130 },
    { label: '半圈', priceAdd: 360 },
    { label: '原隻', priceAdd: 700 },
  ],
};

const duckSizeOptions: MenuOption = {
  name: '部位',
  choices: [
    { label: '上庄', priceAdd: 0 },
    { label: '下庄', priceAdd: 30 },
    { label: '半圈', priceAdd: 260 },
    { label: '原隻', priceAdd: 600 },
  ],
};

const drunkChickenSizeOptions: MenuOption = {
  name: '份量',
  choices: [
    { label: '小份', priceAdd: 0 },
    { label: '大份', priceAdd: 150 },
  ],
};

import { menuImages } from './menuImages';

export const menuItems: MenuItem[] = [
  // 切盤
  {
    id: 'p1',
    name: '文昌雞',
    description: '招牌文昌雞，皮滑肉嫩',
    price: 110,
    category: 'platter',
    popular: true,
    image: menuImages.p1,
    options: [chickenSizeOptions],
  },
  {
    id: 'p2',
    name: '豉油雞',
    description: '古法豉油浸雞，入味鮮香',
    price: 100,
    category: 'platter',
    popular: true,
    image: menuImages.p2,
    options: [soyChickenSizeOptions],
  },
  {
    id: 'p3',
    name: '滷水鴨',
    description: '秘製滷水，香而不膩',
    price: 200,
    category: 'platter',
    image: menuImages.p3,
    options: [duckSizeOptions],
  },
  {
    id: 'p4',
    name: '醉雞',
    description: '紹興酒香醉雞',
    price: 170,
    category: 'platter',
    image: menuImages.p4,
    options: [drunkChickenSizeOptions],
  },
  {
    id: 'p5',
    name: '三牲（需預訂）',
    description: '文昌雞＋豉油雞＋滷水鴨，拜拜祭祀首選',
    price: 1480,
    category: 'platter',
    image: menuImages.p5,
  },

  // 飯類
  {
    id: 'r1',
    name: '文昌雞飯',
    description: '文昌雞切盤配雞油飯',
    price: 100,
    category: 'rice',
    popular: true,
    image: menuImages.r1,
  },
  {
    id: 'r2',
    name: '文昌雞腿飯',
    description: '整隻雞腿配雞油飯',
    price: 140,
    category: 'rice',
    image: menuImages.r2,
  },
  {
    id: 'r3',
    name: '豉油雞飯',
    description: '豉油雞切盤配白飯',
    price: 100,
    category: 'rice',
    image: menuImages.r3,
  },
  {
    id: 'r4',
    name: '豉油雞腿飯',
    description: '整隻豉油雞腿配白飯',
    price: 130,
    category: 'rice',
    image: menuImages.r4,
  },
  {
    id: 'r5',
    name: '雙星飯',
    description: '文昌雞＋豉油雞雙拼配飯',
    price: 120,
    category: 'rice',
    popular: true,
    image: menuImages.r5,
  },
  {
    id: 'r6',
    name: '雙星雞腿飯',
    description: '文昌雞腿＋豉油雞腿雙拼配飯',
    price: 220,
    category: 'rice',
    image: menuImages.r6,
  },
  {
    id: 'r7',
    name: '醉雞飯',
    description: '紹興醉雞配白飯',
    price: 120,
    category: 'rice',
    image: menuImages.r7,
  },
  {
    id: 'r8',
    name: '雞汁悶飯',
    description: '雞汁拌飯，簡單美味',
    price: 50,
    category: 'rice',
    image: menuImages.r8,
  },

  // 小菜
  {
    id: 's1',
    name: '雞心',
    description: '',
    price: 50,
    category: 'side',
    image: menuImages.s1,
  },
  {
    id: 's2',
    name: '雞肝',
    description: '',
    price: 50,
    category: 'side',
    image: menuImages.s2,
  },
  {
    id: 's3',
    name: '雞胗',
    description: '',
    price: 50,
    category: 'side',
    image: menuImages.s3,
  },
  {
    id: 's4',
    name: '雞腳',
    description: '',
    price: 10,
    category: 'side',
    image: menuImages.s4,
  },
  {
    id: 's5',
    name: '雞冠',
    description: '',
    price: 30,
    category: 'side',
    image: menuImages.s5,
  },
  {
    id: 's6',
    name: '雞脖子',
    description: '',
    price: 20,
    category: 'side',
    image: menuImages.s6,
  },
  {
    id: 's7',
    name: '尾錐',
    description: '',
    price: 30,
    category: 'side',
    image: menuImages.s7,
  },
  {
    id: 's8',
    name: '米血',
    description: '',
    price: 10,
    category: 'side',
    image: menuImages.s8,
  },
  {
    id: 's9',
    name: '小豆乾',
    description: '',
    price: 30,
    category: 'side',
    image: menuImages.s9,
  },
  {
    id: 's10',
    name: '滷蛋',
    description: '',
    price: 15,
    category: 'side',
    image: menuImages.s10,
  },
  {
    id: 's11',
    name: '時蔬',
    description: '當日新鮮時蔬',
    price: 30,
    category: 'side',
    image: menuImages.s11,
  },
  {
    id: 's12',
    name: '綜合小菜',
    description: '多種小菜拼盤',
    price: 80,
    category: 'side',
    image: menuImages.s12,
  },

  // 飲品
  {
    id: 'dr1',
    name: '冷泡茶',
    description: '清爽冷泡茶',
    price: 20,
    category: 'drink',
    image: menuImages.dr1,
  },

  // 假日限定
  {
    id: 'w1',
    name: '滷水鴨飯',
    description: '假日限定滷水鴨配白飯',
    price: 100,
    category: 'weekend',
    image: menuImages.w1,
  },
  {
    id: 'w2',
    name: '滷水鴨腿飯',
    description: '假日限定整隻滷水鴨腿配白飯',
    price: 130,
    category: 'weekend',
    image: menuImages.w2,
  },
  {
    id: 'w3',
    name: '三寶飯',
    description: '假日限定文昌雞＋豉油雞＋滷水鴨三拼飯',
    price: 140,
    category: 'weekend',
    popular: true,
    image: menuImages.w3,
  },
];
