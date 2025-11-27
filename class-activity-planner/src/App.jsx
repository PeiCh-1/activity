import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, ClipboardList, Users, MapPin, Bus, 
  Download, Printer, Plus, Save, Trash2, ArrowLeft, 
  Edit3, LayoutDashboard, FileSpreadsheet, List, 
  DollarSign, CheckCircle, UserPlus, Share2, Sparkles, Copy, X, ArrowDown, MessageSquare, Upload, Cloud, CheckSquare, Clock, Home, Phone, AlertCircle, RefreshCw, Globe, Lock, Link as LinkIcon, LogIn, Loader, Wifi
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, getDoc } from 'firebase/firestore';

// --- Firebase 初始化 (修正回線上環境相容模式) ---
// 線上環境會自動注入 __firebase_config，本地端則需手動設定
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'oep-master-default';

// --- UI Components ---

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const styles = {
    info: 'bg-gray-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white'
  };

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${styles[type]} px-6 py-3 rounded-lg shadow-2xl z-[80] flex items-center gap-3 transition-all animate-fade-in-up`}>
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <AlertCircle size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80"><X size={16}/></button>
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto text-red-600">
            <Trash2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 text-center mb-2">{title}</h3>
          <p className="text-gray-600 text-center mb-6 text-sm leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onCancel} 
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
            >
              取消
            </button>
            <button 
              onClick={onConfirm} 
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-md"
            >
              確定刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({ isOpen, activityId, onClose, onCopy }) => {
  if (!isOpen) return null;
  const shareCode = `ACT-${activityId}`;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><Share2 size={20}/> 分享協作活動</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            請將下方的「活動分享碼」傳送給其他老師。他們可以在儀表板點選「匯入協作」並輸入此代碼，即可加入編輯。
          </p>
          <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between border border-gray-200 mb-4 cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => onCopy(shareCode)}>
            <code className="font-mono text-lg font-bold text-indigo-700 select-all">{shareCode}</code>
            <button className="text-gray-500 hover:text-indigo-600">
              <Copy size={20} />
            </button>
          </div>
          <button onClick={onClose} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">完成</button>
        </div>
      </div>
    </div>
  );
};

const ImportModal = ({ isOpen, onClose, onImport, isLoading }) => {
  const [code, setCode] = useState('');
  
  useEffect(() => {
      if(isOpen) setCode('');
  }, [isOpen]);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm ${!isOpen && 'hidden'}`}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="bg-green-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><LogIn size={20}/> 匯入協作活動</h3>
          <button onClick={onClose} disabled={isLoading}><X size={20}/></button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">請輸入活動分享碼 (例如: ACT-173...)</label>
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded p-3 text-lg font-mono mb-4 focus:ring-2 focus:ring-green-500 outline-none uppercase"
            placeholder="ACT-..."
            disabled={isLoading}
          />
          <button 
            onClick={() => onImport(code)} 
            disabled={!code || isLoading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader size={18} className="animate-spin" /> : <Download size={18}/>} 
            {isLoading ? '正在查詢與加入...' : '匯入至儀表板'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 輔助函數 ---
const calculateDateStr = (baseDateStr, daysOffset) => {
  if (!baseDateStr) return '';
  const date = new Date(baseDateStr);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  // Handle negative minutes or wrap around 24 hours safely
  let totalMinutes = minutes;
  while (totalMinutes < 0) totalMinutes += 24 * 60;
  
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const updateRundownTimes = (rundown, changedIndex, newTimeStr) => {
  const newRundown = [...rundown];
  const timeRegex = /^(\d{2}:\d{2})\s*[-~～]\s*(\d{2}:\d{2})$/;
  const match = newTimeStr.match(timeRegex);
  newRundown[changedIndex] = { ...newRundown[changedIndex], time: newTimeStr };
  if (!match) return newRundown;
  const [_, newStart, newEnd] = match;
  const newEndMins = timeToMinutes(newEnd);
  let currentEndMins = newEndMins;
  for (let i = changedIndex + 1; i < newRundown.length; i++) {
    const nextItem = newRundown[i];
    const nextMatch = nextItem.time.match(timeRegex);
    if (nextMatch) {
      const [__, nextStart, nextEnd] = nextMatch;
      const nextStartMins = timeToMinutes(nextStart);
      const nextEndMins = timeToMinutes(nextEnd);
      const duration = nextEndMins - nextStartMins;
      const newNextStartMins = currentEndMins;
      const newNextEndMins = newNextStartMins + duration;
      const newNextTimeStr = `${minutesToTime(newNextStartMins)}-${minutesToTime(newNextEndMins)}`;
      newRundown[i] = { ...nextItem, time: newNextTimeStr };
      currentEndMins = newNextEndMins;
    } else {
      const singleTimeRegex = /^(\d{2}:\d{2})/;
      if (nextItem.time.match(singleTimeRegex)) {
         const newSingleTime = `${minutesToTime(currentEndMins)}~`;
         newRundown[i] = { ...nextItem, time: newSingleTime };
         break; 
      } else { break; }
    }
  }
  return newRundown;
};

const exportToCSV = (filename, headers, rows) => {
  const BOM = "\uFEFF"; 
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportBackupJSON = (activities) => {
  const dataStr = JSON.stringify(activities, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.download = `OEP_Backup_${date}.json`;
  link.href = url;
  link.click();
};

const indoorTypeMap = {
  'lecture': '專題講座',
  'party': '同樂會',
  'show': '成果展示會',
  'workshop': '親師生研習'
};

const generateScripts = (params) => {
    const { activityMode, type, startTime, endTime, location } = params;
    const activityTypeName = activityMode === 'indoor' ? (indoorTypeMap[type] || type) : '戶外教學';
    const speechEnd = minutesToTime(timeToMinutes(startTime) + 10);
    const transportArrival = minutesToTime(timeToMinutes(startTime) + 5);
    const transportLeave = minutesToTime(timeToMinutes(endTime) - 10);

    let scripts = {};

    if (activityMode === 'indoor') {
        scripts = {
            parent: `[正式版]\n親愛的家長您好：\n本班將於明日辦理${activityTypeName}活動，敬請協助孩子 於 ${startTime} 前到校集合，預計 ${endTime} 左右結束。感謝您的支持與配合！\n\n[親切版]\n家長您好～\n提醒您明天是我們的${activityTypeName}！請協助讓孩子 ${startTime} 準時帶好物品，預計結束時間為 ${endTime}，謝謝您！`,
            student: `[正式版]\n明日將進行${activityTypeName}，請同學務必 於 ${startTime} 準時參與，並確實攜帶所需物品。請事先確認用品齊全，認真參與活動！\n\n[親切版]\n大家記得明天要${activityTypeName}喔～\n可以準備隨身包裡，帶好水壺、鉛筆盒。\n${startTime} 準時開始，別讓隊友等你，明天一起開心學習吧！`,
            teacher: `[正式版]\nOO老師您好：\n明日本班學生將於 ${startTime}–${endTime} 公假參與校內${activityTypeName}。午餐部分已確認 全員不留／部分學生需留（名單如下）。特此告知，感謝您的協助。\n\n[親切版]\n老師您好～\n提醒您明天孩子們會在 ${startTime}–${endTime} 參加${activityTypeName}。\n午餐狀況為 全員不留／部分學生需留（名單如下）。感謝您的支持！`,
            official: `[正式版]\n主任／校長您好：\n明日上午本班將辦理${activityTypeName}，學生將於 ${startTime} 於${location}集合。誠摯邀請您蒞臨給予學生勉勵，感謝您！敬祝順心。\n\n[親切版]\n主任／校長您好～\n明天孩子們要進行${activityTypeName}，邀請您在 ${startTime}–${speechEnd} 來跟孩子們說幾句話，勉勵孩子們學習，謝謝您！`
        };
    } else {
        scripts = {
            parent: `[正式版]\n親愛的家長您好：\n本班將於明日辦理戶外教學活動，敬請協助孩子 於 ${startTime} 前到校集合，預計 ${endTime} 左右返校。煩請留意接送時間，以利行程順利進行，感謝您的支持與配合！\n\n[親切版]\n家長您好～\n提醒您明天是我們的戶外教學！請協助讓孩子 ${startTime} 準時帶好物品集合，回程預計為 ${endTime}，再麻煩您協助安排接送，謝謝您！`,
            student: `[正式版]\n明日將進行戶外教學，請同學務必 於 ${startTime} 前到校，並確實攜帶水壺、防曬/寒衣物、鉛筆盒、學習單及個人物品。請事先確認用品齊全，從從容容展開戶外教學的第一步喔！\n\n[親切版]\n大家記得明天要戶外教學喔～\n可以準備隨身包裡，帶好水壺、帽子、防曬/寒衣物、鉛筆盒、學習單。\n${startTime} 準時在ＯＯ集合，別讓隊友等你，明天一起開心出發吧！`,
            teacher: `[正式版]\nOO老師您好：\n明日本班學生將於 ${startTime}–${endTime} 公假外出參與戶外教學。午餐部分已確認 全員不留／部分學生需留（名單如下）。特此告知，感謝您的協助。\n\n[親切版]\n老師您好～\n提醒您明天孩子們會在 ${startTime}–${endTime} 公假外出參加戶外教學。\n午餐狀況為 全員不留／部分學生需留（名單如下）。感謝您的支持！`,
            official: `[正式版]\n主任／校長您好：\n明日上午本班將辦理戶外教學，學生將於 ${startTime} 於ＯＯ地集合準備出發。誠摯邀請您於出發前蒞臨給予學生勉勵，感謝您！敬祝順心。\n\n[親切版]\n主任／校長您好～\n明天孩子們要出發戶外教學，邀請您在 ${startTime}–${speechEnd} 來跟孩子們說幾句話，勉勵孩子們學習，謝謝您！`
        };
    }

    if (activityMode !== 'indoor') {
        scripts.transport = `[正式版]\n您好：\n提醒明日安排之遊覽車請於 ${transportArrival} 抵達本校大門口，並於 ${transportLeave} 回校接學生返程，另外請您協助提供 車籍資料、駕駛姓名與聯絡電話 以利校安通報，謝謝！\n\n[親切版]\n司機大哥您好～\n明天麻煩您 ${transportArrival} 到校門口集合，回程時間約 ${transportLeave}。孩子們很期待這趟小旅行，感謝您協助接送！\n※ 因為活動需要進行校安通報，也請您提供 車號、駕駛姓名與聯絡電話，非常感謝！`;
    }
    return scripts;
};


// --- 核心資料生成 ---
const generateActivity = (params) => {
  const { name, date, location, startTime, endTime, isCrossCounty, students, parents, teachers, type, activityMode, contactName, contactInfo, isPublic } = params; 
  const id = Date.now().toString();
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const lunchStartMins = timeToMinutes('12:00');
  const lunchEndMins = timeToMinutes('12:30');
  const hasLunch = (startMins <= lunchStartMins) && (endMins >= lunchEndMins);

  const defaultOwners = []; 

  let timeline = [];
  let rundown = [];
  let costs = [];

  const activityTypeName = activityMode === 'indoor' ? (indoorTypeMap[type] || type) : '戶外教學';

  if (activityMode === 'indoor') {
    timeline = [
        { id: 1, phase: 'I. 初步確認', date: calculateDateStr(date, -30), title: '活動主題與講師確認', desc: '確認活動形式與邀請對象。', owner: '', completed: false },
        { id: 2, phase: 'II. 行政協調', date: calculateDateStr(date, -21), title: '場地與設備預借', desc: '預借教室、投影機、麥克風。', owner: '', completed: false },
        { id: 3, phase: 'III. 家長聯繫', date: calculateDateStr(date, -14), title: '發出邀請函/通知', desc: '通知家長活動時間與需協助事項。', owner: '', completed: false },
        { id: 4, phase: 'IV. 行前準備', date: calculateDateStr(date, -7), title: '物資採買與講義', desc: '準備茶水、點心、學習單。', owner: '', completed: false },
        { id: 5, phase: 'V. 最終確認', date: calculateDateStr(date, -3), title: '設備測試與佈置', desc: '測試麥克風、簡報筆，確認桌椅排列。', owner: '', completed: false },
        { id: 6, phase: 'VI. 活動當日', date: date, title: '活動日', desc: '詳見「當日細流」。', owner: '', completed: false },
        { id: 7, phase: 'VII. 活動結束', date: calculateDateStr(date, 2), title: '成果紀錄與核銷', desc: '整理照片、費用核銷。', owner: '', completed: false },
    ];

    const prepEnd = Math.min(startMins + 30, endMins); 
    rundown.push({ id: 'r1', time: `${startTime}-${minutesToTime(prepEnd)}`, activity: '報到與準備', detail: '1.簽到處設置\n2.引導入座\n3.設備確認' });
    let currentM = prepEnd;
    if (currentM + 10 < endMins) {
        rundown.push({ id: 'r2', time: `${minutesToTime(currentM)}-${minutesToTime(currentM+10)}`, activity: '開場引言', detail: '1.主持人開場\n2.長官致詞' });
        currentM += 10;
    }
    
    let mainActivityName = activityTypeName || '主活動';

    if (hasLunch) {
        if (currentM < lunchStartMins) {
            rundown.push({ id: 'r_main1', time: `${minutesToTime(currentM)}-12:00`, activity: `${mainActivityName} (上半場)`, detail: '活動進行' });
        }
        rundown.push({ id: 'r_lunch', time: '12:00-13:00', activity: '午餐/休息', detail: '用餐與交流' });
        currentM = timeToMinutes('13:00');
    }
    if (currentM < endMins - 20) {
        rundown.push({ id: 'r_main2', time: `${minutesToTime(currentM)}-${minutesToTime(endMins-20)}`, activity: hasLunch ? `${mainActivityName} (下半場)` : mainActivityName, detail: '活動進行' });
        currentM = endMins - 20;
    }
    rundown.push({ id: 'r_end', time: `${minutesToTime(currentM)}-${endTime}`, activity: '結尾與場復', detail: '1.Q&A/回饋\n2.大合照\n3.場地復原' });

    costs = [
        { id: 1, name: '講師鐘點費', amount: 2000, type: 'lump', shareStudent: false, shareParent: false },
        { id: 2, name: '茶水點心費', amount: 50, type: 'head', shareStudent: true, shareParent: false },
        { id: 3, name: '教材材料費', amount: 100, type: 'head', shareStudent: true, shareParent: false },
    ];
    if (hasLunch) {
        costs.push({ id: 4, name: '午餐便當', amount: 100, type: 'head', shareStudent: true, shareParent: true });
    }

  } else {
    // 戶外教學
    timeline = [
        { id: 1, phase: 'I. 初步確認', date: calculateDateStr(date, -112), title: '學期初規劃', desc: '確認日期可行性，聯繫參訪單位確認人數與課程。', owner: '', completed: false },
        { id: 2, phase: 'II. 行政核准', date: calculateDateStr(date, -105), title: '送出申請單', desc: '填寫校內戶外教育申請表。', owner: '', completed: false },
        { id: 3, phase: 'II. 行政核准', date: calculateDateStr(date, -100), title: '預約交通/車輛', desc: isCrossCounty ? '核心項目：確認遊覽車報價與預約 (需含車籍資料)。' : '確認當天交通方式。', owner: '', completed: false },
        { id: 4, phase: 'III. 家長協調', date: calculateDateStr(date, -98), title: '班親會說明', desc: '提出家長人力需求 (隨隊家長)，說明分工。', owner: '', completed: false },
        { id: 5, phase: 'IV. 行前準備', date: calculateDateStr(date, -21), title: '發放通知單', desc: '發給學生家長通知單，確認收費與請假手續。', owner: '', completed: false },
        { id: 6, phase: 'IV. 行前準備', date: calculateDateStr(date, -14), title: '手冊與學習單', desc: '設計並印製活動手冊。', owner: '', completed: false },
        { id: 7, phase: 'V. 最終確認', date: calculateDateStr(date, -10), title: '確認細節', desc: hasLunch ? '訂便當，確認當日分組名單。' : '確認當日分組名單與集合時間。', owner: '', completed: false },
        { id: 8, phase: 'VI. 活動當日', date: date, title: '活動日', desc: '詳見「當日細流」分頁。', owner: '', completed: false },
        { id: 9, phase: 'VII. 活動結束', date: calculateDateStr(date, 2), title: '成果分享', desc: '整理照片，發布班網/Blog 文章，核銷經費。', owner: '', completed: false },
    ];

    rundown = [];
    let currentM = startMins;
    rundown.push({ id: 'r_meet', time: `${minutesToTime(currentM)}-${minutesToTime(currentM+20)}`, activity: '集合與整備', detail: '1.清點人數\n2.行前安全宣導' });
    currentM += 20;
    rundown.push({ id: 'r_go', time: `${minutesToTime(currentM)}-${minutesToTime(currentM+60)}`, activity: '前往目的地', detail: '交通移動' });
    currentM += 60;

    if (hasLunch) {
        if (currentM < lunchStartMins) {
             rundown.push({ id: 'r_act1', time: `${minutesToTime(currentM)}-12:00`, activity: '主題探索活動', detail: '1.導覽解說\n2.實地觀察' });
        }
        rundown.push({ id: 'r_lunch', time: '12:00-13:00', activity: '午餐時光', detail: '1.領取餐盒\n2.用餐與休息\n3.垃圾分類' });
        currentM = timeToMinutes('13:00');
    }
    const returnStart = endMins - 60; 
    if (currentM < returnStart) {
         rundown.push({ id: 'r_act2', time: `${minutesToTime(currentM)}-${minutesToTime(returnStart)}`, activity: hasLunch ? '下午場活動' : '主題探索活動', detail: '1.體驗活動\n2.大合照' });
         currentM = returnStart;
    }
    rundown.push({ id: 'r_back', time: `${minutesToTime(currentM)}-${endTime}`, activity: '賦歸', detail: '1.清點人數\n2.返回學校\n3.發群組通知' });

    if (isCrossCounty) costs.push({ id: 1, name: '遊覽車資', amount: 8000, type: 'lump', shareStudent: true, shareParent: true });
    costs.push({ id: 2, name: '活動導覽費', amount: 1600, type: 'lump', shareStudent: true, shareParent: false });
    if (hasLunch) costs.push({ id: 3, name: '午餐便當', amount: 80, type: 'head', shareStudent: true, shareParent: true });
    costs.push({ id: 4, name: '門票費用', amount: 60, type: 'head', shareStudent: true, shareParent: true });
  }

  const scripts = generateScripts({ activityMode, type, startTime, endTime, location });

  return {
    id,
    schoolName: '莒光國小',
    teacherName: '張老師',
    activityName: name,
    activityDate: date,
    activityType: activityTypeName,
    location: location,
    isCrossCounty,
    studentCount: students,
    parentCount: parents,
    teacherCount: teachers,
    meetingTime: startTime,
    dismissTime: endTime,
    lastUpdated: new Date().toLocaleString(),
    owners: defaultOwners,
    timeline,
    rundown,
    checkedState: {},
    manualChecklist: [],
    costs,
    blogInputs: { highlight: '', funny: '', learning: '', thanks: '' },
    blogNotes: '',
    scripts,
    activityMode,
    contactName: contactName || '',
    contactInfo: contactInfo || '',
    isPublic: !!isPublic
  };
};

// --- NewActivityModal ---
const NewActivityModal = ({ onClose, onCreate, onNotify }) => {
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    activityMode: 'outdoor', 
    type: 'lecture', 
    startTime: '08:10', 
    endTime: '12:00',
    isCrossCounty: true, 
    students: 15,
    parents: 5,
    teachers: 2,
    contactName: '',
    contactInfo: '',
    isPublic: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.location) {
      onNotify('請填寫活動名稱與地點', 'error');
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="bg-blue-600 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Sparkles size={20} /> AI 快速規劃精靈
          </h3>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded"><X size={20}/></button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">活動名稱</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-300 outline-none" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">日期</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">地點/場地</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded border border-gray-100">
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">聯絡人 (選填)</label>
               <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="如: 陳先生" />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">聯絡方式 (選填)</label>
               <input type="text" name="contactInfo" value={formData.contactInfo} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="電話/Line" />
             </div>
          </div>

          <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">活動模式</label>
              <div className="flex gap-2">
                  <button 
                    onClick={() => setFormData({...formData, activityMode: 'outdoor'})}
                    className={`flex-1 py-2 rounded border text-sm font-bold ${formData.activityMode === 'outdoor' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500'}`}
                  >
                    <Bus size={16} className="inline mr-1"/> 戶外教學
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, activityMode: 'indoor'})}
                    className={`flex-1 py-2 rounded border text-sm font-bold ${formData.activityMode === 'indoor' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-500'}`}
                  >
                    <Home size={16} className="inline mr-1"/> 校內活動
                  </button>
              </div>
          </div>

          {formData.activityMode === 'outdoor' ? (
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded">
                <div className="col-span-2 grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-blue-700 mb-1">集合/開始時間</label>
                        <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border rounded p-1 text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-700 mb-1">返校/結束時間</label>
                        <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border rounded p-1 text-sm"/>
                    </div>
                </div>
                <div className="col-span-2 flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-bold text-gray-700">
                    <input type="checkbox" name="isCrossCounty" checked={formData.isCrossCounty} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                    需遊覽車
                  </label>
                </div>
              </div>
          ) : (
              <div className="bg-green-50 p-3 rounded space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-green-700 mb-1">校內活動類型</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full border rounded p-1 text-sm">
                        <option value="lecture">專題講座</option>
                        <option value="party">同樂會</option>
                        <option value="show">成果展示會</option>
                        <option value="workshop">親師生研習</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-green-700 mb-1">開始時間</label>
                        <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border rounded p-1 text-sm"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-green-700 mb-1">結束時間</label>
                        <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border rounded p-1 text-sm"/>
                    </div>
                </div>
              </div>
          )}

          <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
             <label className="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleChange} className="sr-only peer" />
               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
               <span className="ml-3 text-sm font-bold text-indigo-900 flex items-center gap-1"><Users size={16}/> 開放多人協作 (公開)</span>
             </label>
          </div>

          <button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition-colors flex justify-center items-center gap-2">
            <Sparkles size={18} /> 生成規劃建議
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 子組件定義 ---

const TimelineView = ({ activity, onUpdate }) => {
  const [newOwner, setNewOwner] = useState('');

  const handleTimelineChange = (index, field, value) => {
    const newTimeline = [...activity.timeline];
    newTimeline[index][field] = value;
    onUpdate({ ...activity, timeline: newTimeline });
  };

  const handleAddOwner = () => {
    if (newOwner && !activity.owners.includes(newOwner)) {
      onUpdate({ ...activity, owners: [...activity.owners, newOwner] });
      setNewOwner('');
    }
  };

  const handleCloudExport = () => {
    const headers = ['日期', '階段', '工作項目', '詳細內容', '負責人', '完成狀態'];
    const rows = activity.timeline.map(item => [
      item.date, item.phase, item.title, item.desc, item.owner, item.completed ? '已完成' : '未完成'
    ]);
    exportToCSV(`${activity.activityName}_學期進度表`, headers, rows);
  };

  return (
    <div className="space-y-4 print-content">
      <div className="flex justify-between items-center mb-4 no-print">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          學期進度規劃表
        </h3>
        <div className="flex gap-2">
          <button onClick={handleCloudExport} className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded flex items-center gap-1">
             <FileSpreadsheet size={14} /> 匯出
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 no-print">
        <UserPlus size={16} className="text-blue-600" />
        <span className="text-sm font-bold text-blue-800">新增負責人：</span>
        <input type="text" placeholder="輸入姓名..." value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="p-1 px-2 border rounded text-sm w-32" />
        <button onClick={handleAddOwner} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-bold">新增</button>
        <span className="text-xs text-gray-500 ml-2">(目前名單: {activity.owners.join(', ')})</span>
      </div>
      
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-blue-50 text-blue-800 font-semibold">
            <tr>
              <th className="p-3 w-10 text-center">狀態</th>
              <th className="p-3 w-32">日期 (可調整)</th>
              <th className="p-3 w-1/5">階段</th>
              <th className="p-3">工作項目與內容</th>
              <th className="p-3 w-24">負責人</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activity.timeline.map((item, index) => (
              <tr key={item.id} className={item.completed ? "bg-green-50" : "hover:bg-gray-50"}>
                <td className="p-3 text-center">
                   <button onClick={() => handleTimelineChange(index, 'completed', !item.completed)} className={`p-1 rounded ${item.completed ? 'text-green-600' : 'text-gray-300'}`}>
                     <CheckCircle size={20} fill={item.completed ? "currentColor" : "none"} />
                   </button>
                </td>
                <td className="p-3"><input type="date" value={item.date} onChange={(e) => handleTimelineChange(index, 'date', e.target.value)} className="w-full p-1 border rounded bg-transparent text-gray-700 text-xs" /></td>
                <td className="p-3 text-gray-500 font-medium">{item.phase}</td>
                <td className="p-3">
                  <div className={`font-bold ${item.completed ? 'text-green-800 line-through' : 'text-gray-800'}`}>{item.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                </td>
                <td className="p-3">
                   <select value={item.owner} onChange={(e) => handleTimelineChange(index, 'owner', e.target.value)} className="p-1 border rounded bg-white w-full text-gray-700 text-xs">
                     <option value="">未定</option>
                     {activity.owners.map(o => <option key={o} value={o}>{o}</option>)}
                   </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RundownView = ({ activity, onUpdate }) => {
  const handleAddRow = () => { const newRundown = [...(activity.rundown || []), { id: Date.now(), time: '', activity: '', detail: '' }]; onUpdate({ ...activity, rundown: newRundown }); };
  const handleInsertRow = (index) => { const newRundown = [...(activity.rundown || [])]; newRundown.splice(index + 1, 0, { id: Date.now(), time: '', activity: '新行程', detail: '' }); onUpdate({ ...activity, rundown: newRundown }); };
  const handleRowChange = (index, field, value) => { let newRundown; if (field === 'time') { newRundown = updateRundownTimes(activity.rundown || [], index, value); } else { newRundown = [...(activity.rundown || [])]; newRundown[index][field] = value; } onUpdate({ ...activity, rundown: newRundown }); };
  const handleDeleteRow = (index) => { const newRundown = [...(activity.rundown || [])]; newRundown.splice(index, 1); onUpdate({ ...activity, rundown: newRundown }); };
  const handleCloudExport = () => { const headers = ['時間', '流程', '細部工作內容']; const rows = (activity.rundown || []).map(item => [item.time, item.activity, item.detail]); exportToCSV(`${activity.activityName}_當日細流`, headers, rows); };

  return (
    <div className="space-y-4 print-content">
      <div className="flex justify-between items-center mb-4 no-print"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><List className="w-5 h-5 text-red-600" />當日活動細流</h3><div className="flex gap-2"><button onClick={handleCloudExport} className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded flex items-center gap-1"><FileSpreadsheet size={14} /> 匯出</button></div></div>
      <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800 mb-4 no-print flex items-start gap-2"><Sparkles size={16} className="mt-0.5 flex-shrink-0" /><div><strong>智慧時間連動：</strong> 修改「結束時間」（例如 09:00-10:15），下方行程將自動順延。</div></div>
      <div className="overflow-x-auto border rounded-lg shadow-sm bg-white"><table className="w-full text-sm text-left border-collapse"><thead className="bg-red-50 text-red-800 font-bold"><tr><th className="p-3 border-b w-36">時間 (起-迄)</th><th className="p-3 border-b w-48">流程項目</th><th className="p-3 border-b">細部工作內容 (SOP)</th><th className="p-3 border-b w-20 text-center no-print">操作</th></tr></thead><tbody className="divide-y divide-gray-200">{(activity.rundown || []).map((item, index) => (<tr key={item.id} className="hover:bg-gray-50 align-top group"><td className="p-2"><input type="text" value={item.time} onChange={(e) => handleRowChange(index, 'time', e.target.value)} className="w-full p-1 border rounded bg-transparent focus:bg-white font-mono text-gray-700 focus:ring-2 focus:ring-blue-200 outline-none text-center" placeholder="09:00-10:00" /></td><td className="p-2"><input type="text" value={item.activity} onChange={(e) => handleRowChange(index, 'activity', e.target.value)} className="w-full p-1 border rounded bg-transparent focus:bg-white font-bold text-gray-800 focus:ring-2 focus:ring-blue-200 outline-none" placeholder="活動項目" /></td><td className="p-2"><textarea value={item.detail} onChange={(e) => handleRowChange(index, 'detail', e.target.value)} className="w-full p-1 border rounded bg-transparent focus:bg-white h-20 text-gray-600 whitespace-pre-wrap resize-none leading-relaxed focus:ring-2 focus:ring-blue-200 outline-none" placeholder="詳細步驟..." /></td><td className="p-2 text-center no-print flex flex-col gap-2 justify-center h-24"><button onClick={() => handleInsertRow(index)} className="text-blue-400 hover:text-blue-600 flex items-center justify-center" title="在此行下方插入"><ArrowDown size={16}/></button><button onClick={() => handleDeleteRow(index)} className="text-gray-300 hover:text-red-500 flex items-center justify-center" title="刪除"><Trash2 size={16} /></button></td></tr>))}</tbody></table><div className="p-2 bg-gray-50 text-center no-print"><button onClick={handleAddRow} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center justify-center gap-1 w-full"><Plus size={16} /> 新增流程步驟</button></div></div>
    </div>
  );
};

const ChecklistView = ({ activity, onUpdate }) => {
  const derivedItems = useMemo(() => {
    const items = new Set();
    const rundownText = JSON.stringify(activity.rundown || []);
    if (activity.activityMode !== 'indoor') {
        if (rundownText.includes('遊覽車') || activity.isCrossCounty) items.add('確認遊覽車預約與車號');
        if (rundownText.includes('車資')) items.add('準備遊覽車資/司機小費(若有)');
    }
    if (rundownText.includes('便當') || rundownText.includes('餐盒') || rundownText.includes('午餐')) items.add('確認午餐/便當數量與送達時間');
    if (rundownText.includes('飲料')) items.add('確認飲料數量');
    if (rundownText.includes('保險')) items.add('確認旅遊平安險投保完畢');
    
    if (rundownText.includes('講座') || rundownText.includes('講師')) { items.add('確認講師簡報筆/投影設備'); items.add('準備講師茶水/感謝狀'); }
    if (rundownText.includes('桌椅') || rundownText.includes('場地')) items.add('確認場地桌椅排列');
    if (rundownText.includes('麥克風')) items.add('測試麥克風/音響設備');
    const timelineText = JSON.stringify(activity.timeline || []);
    if (timelineText.includes('申請單')) items.add('送出校內申請單/場地借用單');
    if (timelineText.includes('通知單')) items.add('回收家長同意書/通知單');
    return Array.from(items).map(text => ({ text, isAuto: true }));
  }, [activity.rundown, activity.timeline, activity.isCrossCounty, activity.activityMode]);

  const toggleCheck = (text) => { const newState = { ...activity.checkedState }; newState[text] = !newState[text]; onUpdate({ ...activity, checkedState: newState }); };
  const handleAddManual = () => { const newItem = { id: Date.now().toString(), text: '新待辦事項' }; onUpdate({ ...activity, manualChecklist: [...(activity.manualChecklist || []), newItem] }); };
  const updateManualText = (id, val) => { const newList = activity.manualChecklist.map(item => item.id === id ? { ...item, text: val } : item); onUpdate({ ...activity, manualChecklist: newList }); };
  const deleteManual = (id) => { const newList = activity.manualChecklist.filter(item => item.id !== id); onUpdate({ ...activity, manualChecklist: newList }); };
  const handleCloudExport = () => { const headers = ['待辦事項', '來源', '完成狀態']; const allItems = [...(activity.manualChecklist || []).map(i=>({...i, isAuto:false})), ...derivedItems]; const rows = allItems.map(item => [item.text, item.isAuto ? '自動生成' : '手動新增', activity.checkedState?.[item.text] ? '已完成' : '未完成']); exportToCSV(`${activity.activityName}_檢核項目`, headers, rows); };
  const allItems = useMemo(() => { const autoItems = derivedItems.map(item => ({ ...item, isAuto: true })); const manualItems = (activity.manualChecklist || []).map(item => ({ ...item, isAuto: false })); return [...autoItems, ...manualItems]; }, [derivedItems, activity.manualChecklist]);

  return (
    <div className="space-y-4 print-content">
      <div className="flex justify-between items-center mb-4 no-print"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4"><ClipboardList className="w-5 h-5 text-purple-600" />檢核項目</h3><div className="flex gap-2"><button onClick={handleCloudExport} className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded flex items-center gap-1"><FileSpreadsheet size={14} /> 匯出</button></div></div>
      <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4 shadow-sm"><h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2"><Sparkles size={16} /> 系統自動建議</h4><ul className="space-y-2">{allItems.filter(i => i.isAuto).map((item, idx) => (<li key={idx} className="flex items-center gap-2"><input type="checkbox" checked={!!activity.checkedState?.[item.text]} onChange={() => toggleCheck(item.text)} className="w-4 h-4 text-purple-600 rounded cursor-pointer" /><span className={activity.checkedState?.[item.text] ? 'text-gray-400 line-through' : 'text-gray-700'}>{item.text}</span></li>))}{allItems.filter(i => i.isAuto).length === 0 && <li className="text-gray-400 text-xs italic">尚無建議，請在細流中填寫更多細節...</li>}</ul></div>
          <div className="bg-white border rounded-lg p-4 shadow-sm"><h4 className="font-bold text-gray-700 mb-3 flex justify-between items-center"><span>手動待辦事項</span><button onClick={handleAddManual} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 no-print"><Plus size={12} /> 新增</button></h4><ul className="space-y-2">{allItems.filter(i => !i.isAuto).map((item) => (<li key={item.id} className="flex items-center gap-2"><input type="checkbox" checked={!!activity.checkedState?.[item.text]} onChange={() => toggleCheck(item.text)} className="w-4 h-4 text-purple-600 rounded cursor-pointer" /><input type="text" value={item.text} onChange={(e) => updateManualText(item.id, e.target.value)} className={`flex-1 border-b border-gray-100 focus:border-purple-500 outline-none bg-transparent ${activity.checkedState?.[item.text] ? 'text-gray-400 line-through' : ''}`} /><button onClick={() => deleteManual(item.id)} className="text-gray-300 hover:text-red-500 no-print"><Trash2 size={14} /></button></li>))}</ul></div>
      </div>
    </div>
  );
};

const CostCalculatorView = ({ activity, onUpdate }) => {
  const calculateFees = () => {
    let studentTotal = 0; let parentTotal = 0;
    activity.costs.forEach(cost => {
      const amount = parseFloat(cost.amount) || 0;
      let perPersonCost = 0;
      if (cost.type === 'lump') { let splitCount = 0; if (cost.shareStudent) splitCount += parseInt(activity.studentCount || 0); if (cost.shareParent) splitCount += parseInt(activity.parentCount || 0); perPersonCost = splitCount > 0 ? Math.ceil(amount / splitCount) : 0; } else { perPersonCost = amount; }
      if (cost.shareStudent) studentTotal += perPersonCost; if (cost.shareParent) parentTotal += perPersonCost;
    });
    return { studentTotal, parentTotal };
  };
  const { studentTotal, parentTotal } = calculateFees();
  const handleCostChange = (index, field, value) => { const newCosts = [...activity.costs]; newCosts[index][field] = value; onUpdate({ ...activity, costs: newCosts }); };
  const handleAddCost = () => { const newCost = { id: Date.now(), name: '新項目', amount: 0, type: 'head', shareStudent: true, shareParent: false }; onUpdate({ ...activity, costs: [...activity.costs, newCost] }); };
  const handleDeleteCost = (index) => { const newCosts = [...activity.costs]; newCosts.splice(index, 1); onUpdate({ ...activity, costs: newCosts }); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-yellow-600" /> 費用計算機</h3></div>
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="p-3 text-left">項目名稱</th><th className="p-3 w-24">類型</th><th className="p-3 w-24">金額</th><th className="p-3 text-center">學生</th><th className="p-3 text-center">家長</th><th className="p-3 w-10 no-print"></th></tr></thead><tbody className="divide-y">{activity.costs.map((cost, index) => (<tr key={cost.id} className="hover:bg-gray-50"><td className="p-3"><input type="text" value={cost.name} onChange={(e) => handleCostChange(index, 'name', e.target.value)} className="w-full p-1 border rounded" /></td><td className="p-3"><select value={cost.type} onChange={(e) => handleCostChange(index, 'type', e.target.value)} className="p-1 border rounded w-full"><option value="lump">整筆</option><option value="head">人頭</option></select></td><td className="p-3"><input type="number" value={cost.amount} onChange={(e) => handleCostChange(index, 'amount', e.target.value)} className="w-full p-1 border rounded text-right" /></td><td className="p-3 text-center"><input type="checkbox" checked={cost.shareStudent} onChange={(e) => handleCostChange(index, 'shareStudent', e.target.checked)} className="w-5 h-5 text-blue-600 rounded" /></td><td className="p-3 text-center"><input type="checkbox" checked={cost.shareParent} onChange={(e) => handleCostChange(index, 'shareParent', e.target.checked)} className="w-5 h-5 text-blue-600 rounded" /></td><td className="p-3 text-center no-print"><button onClick={() => handleDeleteCost(index)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td></tr>))}</tbody><tfoot className="bg-yellow-100 font-bold text-gray-800"><tr><td className="p-4 text-right" colSpan={3}>預估收費：</td><td className="p-4 text-center text-lg text-blue-800">${studentTotal}</td><td className="p-4 text-center text-lg text-green-800">${parentTotal}</td><td></td></tr></tfoot></table><div className="p-2 bg-gray-50 text-center no-print border-t"><button onClick={handleAddCost} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center justify-center gap-1 w-full"><Plus size={16} /> 新增費用項目</button></div></div>
    </div>
  );
};

const CommunicationView = ({ activity, onUpdate, onNotify }) => {
  const [activeTab, setActiveTab] = useState('parent');

  const tabs = [
    { id: 'parent', label: '家長通知', icon: Users },
    { id: 'student', label: '學生提醒', icon: UserPlus },
    { id: 'teacher', label: '導師公假', icon: CheckCircle },
    { id: 'official', label: '長官邀約', icon: Sparkles },
    ...(activity.activityMode !== 'indoor' ? [{ id: 'transport', label: '交通聯繫', icon: Bus }] : [])
  ];

  const handleTextChange = (key, val) => {
    const newScripts = { ...activity.scripts, [key]: val };
    onUpdate({ ...activity, scripts: newScripts });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 no-print">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          活動常用聯繫
        </h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 no-print border-b mb-4">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
          <h4 className="font-bold text-indigo-800 flex items-center gap-2">
            {tabs.find(t => t.id === activeTab)?.label} - 訊息模板
          </h4>
          <span className="text-indigo-600 flex items-center gap-1 text-sm font-bold">
            可以直接選取文字進行複製
          </span>
        </div>
        <div className="p-4">
          <textarea 
            value={activity.scripts[activeTab] || ''} 
            onChange={(e) => handleTextChange(activeTab, e.target.value)}
            className="w-full h-96 p-4 border rounded-lg font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-300 outline-none resize-none bg-gray-50 text-gray-700"
          />
        </div>
        <div className="p-3 bg-gray-50 text-xs text-gray-500 text-center border-t">
          此內容由系統根據活動時間地點自動生成，您可以自由編輯後發送。
        </div>
      </div>
    </div>
  );
};

// --- 主視圖 (Dashboard & Editor) ---

const DashboardView = ({ activities, onCreate, onEdit, onDelete, onImport, onExportAll, onOpenImport, onDuplicate }) => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcomingActivities = activities.filter(a => new Date(a.activityDate) >= now);
  const completedActivities = activities.filter(a => new Date(a.activityDate) < now);
  const calculateProgress = (act) => { if (!act.timeline || act.timeline.length === 0) return 0; const completed = act.timeline.filter(t => t.completed).length; return Math.round((completed / act.timeline.length) * 100); };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8"><div><h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><LayoutDashboard className="w-8 h-8 text-blue-600" />班級活動規劃儀表板</h2><p className="text-gray-500 mt-2">管理您的所有戶外教育與校內活動任務</p></div><div className="flex gap-3"><button onClick={onOpenImport} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-3 rounded-lg shadow cursor-pointer flex items-center gap-2 font-bold transition-all"><LogIn size={20} /> 加入協作</button><label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg shadow cursor-pointer flex items-center gap-2 font-bold transition-all"><Upload size={20} /> 匯入備份<input type="file" accept=".json" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { try { const data = JSON.parse(event.target.result); if (Array.isArray(data)) { onImport(data); } else { alert('檔案格式錯誤'); } } catch (error) { alert('讀取檔案失敗'); } }; reader.readAsText(file); } }} /></label><button onClick={onExportAll} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg shadow flex items-center gap-2 font-bold transition-all"><Download size={20} /> 一鍵匯出</button><button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 font-bold transition-all"><Plus size={20} /> 新增活動</button></div></div>
      <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><Clock size={20} /> 進行中活動</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">{upcomingActivities.map((act) => { const progress = calculateProgress(act); return (<div key={act.id} onClick={() => onEdit(act)} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 p-6 group relative overflow-hidden"><div className={`h-2 w-full absolute top-0 left-0 ${act.activityType?.includes('戶外') ? 'bg-blue-500' : 'bg-green-500'}`}></div><div className="flex justify-between mb-2 mt-2"><span className={`text-xs px-2 py-1 rounded-full font-bold ${act.activityType?.includes('戶外') ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{act.activityType}</span>
      <div className="flex items-center gap-1">
        {act.isPublic ? <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold flex items-center gap-1"><Users size={10}/> 多人協作</span> : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold flex items-center gap-1"><Lock size={10}/> 私人</span>}
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(act); }} className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all z-20 relative" title="複製活動"><Copy size={18} /></button>
        <button onClick={(e) => onDelete(act.id, e)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all z-20 relative" title="刪除活動"><Trash2 size={18} /></button>
      </div></div><h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 line-clamp-1">{act.activityName}</h3><div className="space-y-2 text-sm text-gray-600"><div className="flex items-center gap-2"><Calendar size={14} />{act.activityDate || '未設定日期'}</div><div className="flex items-center gap-2"><MapPin size={14} />{act.location || '未設定地點'}</div></div><div className="mt-4"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>規劃進度</span><span>{progress}%</span></div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div></div></div>) })} {upcomingActivities.length === 0 && (<div className="col-span-full text-center py-8 bg-gray-50 rounded-lg text-gray-400">目前沒有進行中的活動</div>)}</div>
      <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><CheckSquare size={20} /> 已完成活動</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">{completedActivities.length > 0 ? (<table className="w-full text-left text-sm"><thead className="bg-gray-50 border-b"><tr><th className="p-4">活動名稱</th><th className="p-4">日期</th><th className="p-4">地點</th><th className="p-4 text-right">操作</th></tr></thead><tbody className="divide-y">{completedActivities.map(act => (<tr key={act.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(act)}><td className="p-4 font-bold text-gray-700">{act.activityName}</td><td className="p-4 text-gray-500">{act.activityDate}</td><td className="p-4 text-gray-500">{act.location}</td><td className="p-4 text-right flex items-center justify-end gap-3"><span className="text-blue-600 hover:underline text-xs">查看回顧</span><button onClick={(e) => { e.stopPropagation(); onDuplicate(act); }} className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-colors z-20 relative" title="複製"><Copy size={16} /></button><button onClick={(e) => onDelete(act.id, e)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors z-20 relative" title="刪除"><Trash2 size={16} /></button></td></tr>))}</tbody></table>) : (<div className="p-8 text-center text-gray-400">尚無已完成的歷史活動</div>)}</div>
    </div>
  );
};

const EditorView = ({ activity, onChange, onUpdate, onSave, onBack, activeTab, setActiveTab, onDelete, onNotify, onShowShare, onDuplicate }) => {
  // 自動更新文案邏輯
  useEffect(() => {
    const refreshedScripts = generateScripts({
        activityMode: activity.activityMode,
        type: activity.activityType,
        startTime: activity.meetingTime,
        endTime: activity.dismissTime,
        location: activity.location
    });
    // 只有當文案內容真的有變動時才更新，避免無限迴圈
    if (JSON.stringify(refreshedScripts) !== JSON.stringify(activity.scripts)) {
        onUpdate({ ...activity, scripts: refreshedScripts });
    }
  }, [activity.activityMode, activity.activityType, activity.meetingTime, activity.dismissTime, activity.location]);

  return (
  <div className="max-w-7xl mx-auto p-4">
    <div className="flex items-center justify-between mb-6 no-print">
      <div className="flex items-center gap-4"><button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-blue-600"><ArrowLeft size={20} /> 返回列表</button>
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 truncate max-w-[200px] md:max-w-md">{activity.activityName}</h2>
            {activity.isPublic ? 
                <span className="text-xs flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded w-fit"><Wifi size={10}/> 多人連線模式</span> : 
                <span className="text-xs flex items-center gap-1 text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded w-fit"><Lock size={10}/> 私人模式</span>
            }
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded"><Cloud size={12} /> 已同步至雲端</span>
        <button onClick={() => onDuplicate(activity)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded shadow flex items-center gap-2"><Copy size={18} /> 複製副本</button>
        <button onClick={(e) => onDelete(activity.id, e)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded shadow flex items-center gap-2"><Trash2 size={18} /> 刪除任務</button>
        <button onClick={onSave} className="bg-blue-600 text-white px-4 py-2 rounded shadow flex items-center gap-2"><Save size={18} /> 儲存</button>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-6 no-print"><div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500"><h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2"><Edit3 size={16} /> 編輯活動參數</h3><div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">活動名稱</label><input type="text" name="activityName" value={activity.activityName} onChange={onChange} className="w-full p-2 border rounded text-sm"/></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-medium text-gray-500 mb-1">日期</label><input type="date" name="activityDate" value={activity.activityDate} onChange={onChange} className="w-full p-2 border rounded text-sm"/></div><div><label className="block text-xs font-medium text-gray-500 mb-1">地點</label><input type="text" name="location" value={activity.location} onChange={onChange} className="w-full p-2 border rounded text-sm"/></div></div>
          
          {activity.activityMode === 'indoor' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">活動類型 (修改後將自動更新文案)</label>
                <select name="activityType" value={activity.activityType} onChange={onChange} className="w-full p-2 border rounded text-sm">
                    <option value="專題講座">專題講座</option>
                    <option value="同樂會">同樂會</option>
                    <option value="成果展示會">成果展示會</option>
                    <option value="親師生研習">親師生研習</option>
                </select>
              </div>
          )}

          <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">聯絡人</label><input type="text" name="contactName" value={activity.contactName} onChange={onChange} className="w-full p-2 border rounded text-sm" placeholder="選填"/></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">聯絡方式</label><input type="text" name="contactInfo" value={activity.contactInfo} onChange={onChange} className="w-full p-2 border rounded text-sm" placeholder="選填"/></div>
          </div>
          <div className="flex gap-2"><input type="time" name="meetingTime" value={activity.meetingTime} onChange={onChange} className="w-1/2 p-2 border rounded text-sm"/><input type="time" name="dismissTime" value={activity.dismissTime} onChange={onChange} className="w-1/2 p-2 border rounded text-sm"/></div>
          <div className="grid grid-cols-3 gap-2"><div><label className="text-xs text-gray-500">學生</label><input type="number" name="studentCount" value={activity.studentCount} onChange={onChange} className="w-full p-2 border rounded text-center text-sm"/></div><div><label className="text-xs text-gray-500">家長</label><input type="number" name="parentCount" value={activity.parentCount} onChange={onChange} className="w-full p-2 border rounded text-center text-sm"/></div><div><label className="text-xs text-gray-500">老師</label><input type="number" name="teacherCount" value={activity.teacherCount} onChange={onChange} className="w-full p-2 border rounded text-center text-sm"/></div></div>
          <div className="pt-2 border-t space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none"><input type="checkbox" name="isCrossCounty" checked={activity.isCrossCounty} onChange={onChange} className="rounded text-blue-600 w-4 h-4" /><span>需租賃遊覽車 (跨縣市)</span></label>
            <div className="flex items-center justify-between bg-indigo-50 p-2 rounded">
                <label className="flex items-center gap-2 text-sm font-bold text-indigo-700 cursor-pointer select-none"><input type="checkbox" name="isPublic" checked={activity.isPublic} onChange={onChange} className="rounded text-indigo-600 w-4 h-4" /><span><Users size={14} className="inline mr-1"/>開放多人協作 (公開)</span></label>
                {activity.isPublic && <button onClick={onShowShare} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-indigo-700"><LinkIcon size={12}/> 取得分享連結</button>}
            </div>
          </div>
      </div></div></div>
      <div className="lg:col-span-8"><div className="bg-white rounded-xl shadow-md min-h-[600px] flex flex-col overflow-hidden"><div className="flex border-b overflow-x-auto bg-gray-50 no-print">{[{ id: 'timeline', label: '學期進度', icon: Calendar, color: 'blue' }, { id: 'rundown', label: '當日細流', icon: List, color: 'red' }, { id: 'checklist', label: '檢核項目', icon: ClipboardList, color: 'purple' }, { id: 'cost', label: '費用計算', icon: DollarSign, color: 'yellow' }, { id: 'communication', label: '常用聯繫', icon: MessageSquare, color: 'indigo' }].map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id ? `border-${tab.color}-500 text-${tab.color}-600 bg-white` : 'border-transparent text-gray-500 hover:bg-gray-100'}`}><tab.icon size={16} /> {tab.label}</button>))}</div><div className="p-4 md:p-8 flex-1 overflow-y-auto">{activeTab === 'timeline' && <TimelineView activity={activity} onUpdate={onUpdate} />}{activeTab === 'rundown' && <RundownView activity={activity} onUpdate={onUpdate} />}{activeTab === 'checklist' && <ChecklistView activity={activity} onUpdate={onUpdate} />}{activeTab === 'cost' && <CostCalculatorView activity={activity} onUpdate={onUpdate} />}{activeTab === 'communication' && <CommunicationView activity={activity} onUpdate={onUpdate} onNotify={onNotify} />}</div></div></div>
    </div>
  </div>
);
};

const App = () => {
  const [viewMode, setViewMode] = useState('dashboard'); 
  const [activities, setActivities] = useState([]); 
  const [currentActivity, setCurrentActivity] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showNewModal, setShowNewModal] = useState(false); 
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoadingImport, setIsLoadingImport] = useState(false);
  
  // Data State
  const [privateActs, setPrivateActs] = useState([]);
  const [publicActs, setPublicActs] = useState([]);
  const [collaborations, setCollaborations] = useState([]); // List of subscribed IDs
  
  // UI Feedback State
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', action: null });

  // Merge Private and Public Activities
  const allActivities = useMemo(() => {
      const map = new Map();
      privateActs.forEach(act => map.set(act.id, act));
      publicActs.forEach(act => map.set(act.id, act));
      return Array.from(map.values()).sort((a, b) => b.id - a.id);
  }, [privateActs, publicActs]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleConfirmAction = async () => {
    if (confirmConfig.action) {
      await confirmConfig.action();
    }
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Listen to PRIVATE collection
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'activities'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, isPublic: false }));
      setPrivateActs(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to COLLABORATIONS collection
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'collaborations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setCollaborations(ids);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen to PUBLIC activities based on Subscriptions (Unified access for both owner and collaborators)
  useEffect(() => {
    if (!user || collaborations.length === 0) {
        setPublicActs([]);
        return;
    }
    
    const unsubscribers = [];
    
    collaborations.forEach(id => {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'activities', id);
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setPublicActs(prev => {
                    const others = prev.filter(p => p.id !== id);
                    return [...others, { ...docSnap.data(), id: docSnap.id, isPublic: true }];
                });
            } else {
                setPublicActs(prev => prev.filter(p => p.id !== id));
            }
        });
        unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(u => u());
  }, [user, collaborations]);

  const saveToCloud = async (activityToSave) => { 
      if (!user) return; 
      
      const publicRef = doc(db, 'artifacts', appId, 'public', 'data', 'activities', String(activityToSave.id));
      const privateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', String(activityToSave.id));
      const collabRef = doc(db, 'artifacts', appId, 'users', user.uid, 'collaborations', String(activityToSave.id));

      try {
        if (activityToSave.isPublic) {
            // 1. Save to Public
            await setDoc(publicRef, activityToSave);
            // 2. Add to my collaborations so I keep seeing it (and so does everyone else who has joined)
            await setDoc(collabRef, { joinedAt: new Date().toISOString() });
            // 3. Delete from Private (it moved)
            await deleteDoc(privateRef).catch(() => {}); 
        } else {
            // 1. Save to Private
            await setDoc(privateRef, activityToSave);
            // 2. Remove from my collaborations
            await deleteDoc(collabRef).catch(() => {});
            // 3. Delete from Public (moved back to private - breaks links for others)
            await deleteDoc(publicRef).catch(() => {});
        }
      } catch (e) {
          console.error("Save error", e);
          showToast("儲存失敗，請檢查網路連線", "error");
      }
  };
  
  const deleteFromCloud = async (activityId) => { 
    if (!user) {
        showToast('尚未連線至雲端，無法執行刪除動作。', 'error');
        return;
    }
    try { 
        const publicRef = doc(db, 'artifacts', appId, 'public', 'data', 'activities', String(activityId));
        const privateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', String(activityId));
        const collabRef = doc(db, 'artifacts', appId, 'users', user.uid, 'collaborations', String(activityId));
        
        await Promise.all([
            deleteDoc(publicRef).catch(() => {}),
            deleteDoc(privateRef).catch(() => {}),
            deleteDoc(collabRef).catch(() => {})
        ]);

        setViewMode('dashboard');
        showToast('活動已成功刪除', 'success');
    } catch (error) { 
        showToast('刪除失敗：' + error.message, 'error'); 
    } 
  };

  const handleJoinActivity = async (shareCode) => {
      if (!user) {
          showToast('請先登入', 'error');
          return;
      }
      const activityId = shareCode.replace('ACT-', '').trim();
      if (!activityId) {
          showToast('代碼格式錯誤', 'error');
          return;
      }

      if (collaborations.includes(activityId)) {
          showToast('您已經加入此活動了！', 'warning');
          setShowImportModal(false);
          return;
      }

      setIsLoadingImport(true);

      try {
        const publicRef = doc(db, 'artifacts', appId, 'public', 'data', 'activities', activityId);
        const docSnap = await getDoc(publicRef);

        if (docSnap.exists()) {
            const collabRef = doc(db, 'artifacts', appId, 'users', user.uid, 'collaborations', activityId);
            await setDoc(collabRef, { joinedAt: new Date().toISOString() });
            showToast('成功加入協作活動！', 'success');
            setShowImportModal(false);
        } else {
            showToast('找不到該活動，請確認代碼是否正確或是活動已被移除/設為私人。', 'error');
        }
      } catch (error) {
          console.error("Import error", error);
          showToast('匯入失敗：網路連線錯誤', 'error');
      } finally {
          setIsLoadingImport(false);
      }
  };
  
  const handleImport = async (data) => { if (!user) return; for (const act of data) { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'activities', String(act.id)), act); } showToast('備份資料已成功匯入私人雲端！', 'success'); };
  const handleExportAll = () => { exportBackupJSON(allActivities); };
  const handleCreateFromModal = async (formData) => { const newActivity = generateActivity(formData); setCurrentActivity(newActivity); setViewMode('editor'); await saveToCloud(newActivity); setShowNewModal(false); };
  
  const handleDuplicate = async (activity) => {
    if (!user) {
        showToast('請先登入', 'error');
        return;
    }
    
    const activityCopy = JSON.parse(JSON.stringify(activity));
    
    const newId = Date.now().toString();
    const newActivity = {
        ...activityCopy,
        id: newId,
        activityName: `${activityCopy.activityName} (副本)`,
        lastUpdated: new Date().toLocaleString(),
        isPublic: false, 
        owners: [] 
    };

    try {
        await saveToCloud(newActivity);
        showToast('活動副本已建立！', 'success');
    } catch (error) {
        console.error("Duplicate error", error);
        showToast('複製失敗', 'error');
    }
  };

  const handleDelete = (id, e) => { 
    if (e) {
        e.stopPropagation(); 
        e.preventDefault();
    }
    setConfirmConfig({
        isOpen: true,
        title: '刪除確認',
        message: '您確定要刪除此活動嗎？若是協作活動，刪除後所有成員都將無法看到。',
        action: () => deleteFromCloud(id)
    });
  };
  
  const handleEdit = (activity) => {
    const defaultData = generateActivity({ name: 'temp', date: new Date().toISOString(), location: 'temp', duration: 'full', isCrossCounty: false, students: 0, parents: 0, teachers: 0, startTime: '08:00', endTime: '16:00', activityMode: 'outdoor' });
    const safeActivity = { 
        ...defaultData, 
        ...activity,
        costs: Array.isArray(activity.costs) ? activity.costs : defaultData.costs,
        owners: Array.isArray(activity.owners) ? activity.owners : defaultData.owners,
        timeline: Array.isArray(activity.timeline) ? activity.timeline : defaultData.timeline,
        checkedState: activity.checkedState || {},
        manualChecklist: activity.manualChecklist || [],
        blogNotes: activity.blogNotes || '',
        scripts: activity.scripts || defaultData.scripts,
        contactName: activity.contactName || '',
        contactInfo: activity.contactInfo || '',
        isPublic: !!activity.isPublic
    };
    setCurrentActivity(safeActivity);
    setViewMode('editor');
  };
  const handleSaveCurrent = async () => { const updatedTime = new Date().toLocaleString(); const activityToSave = { ...currentActivity, lastUpdated: updatedTime }; setCurrentActivity(activityToSave); await saveToCloud(activityToSave); showToast('進度已儲存至雲端！', 'success'); };
  const handleUpdateActivity = async (updatedActivity) => { setCurrentActivity(updatedActivity); await saveToCloud(updatedActivity); };
  
  const handleChange = (e) => { 
      const { name, value, type, checked } = e.target; 
      const updated = { ...currentActivity, [name]: type === 'checkbox' ? checked : value }; 
      
      if (currentActivity && currentActivity.rundown && currentActivity.rundown.length > 0) {
          if (name === 'meetingTime') {
              const oldStartMins = timeToMinutes(currentActivity.meetingTime);
              const newStartMins = timeToMinutes(value);
              const diff = newStartMins - oldStartMins;
              
              if (diff !== 0) {
                  updated.rundown = currentActivity.rundown.map(item => {
                      const timeRegex = /^(\d{2}:\d{2})\s*([-~～])\s*(\d{2}:\d{2})$/;
                      const match = item.time.match(timeRegex);
                      if (match) {
                          const s = timeToMinutes(match[1]);
                          const e = timeToMinutes(match[3]);
                          return { ...item, time: `${minutesToTime(s + diff)}${match[2]}${minutesToTime(e + diff)}` };
                      }
                      return item;
                  });
              }
          }
          
          if (name === 'dismissTime') {
              const lastIdx = updated.rundown.length - 1;
              const lastItem = updated.rundown[lastIdx];
              const timeRegex = /^(\d{2}:\d{2})\s*([-~～])\s*(\d{2}:\d{2})$/;
              const match = lastItem.time.match(timeRegex);
              if (match) {
                  updated.rundown[lastIdx] = { ...lastItem, time: `${match[1]}${match[2]}${value}` };
              }
          }
      }

      setCurrentActivity(updated); 
  };

  const handleCopyCode = (code) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        showToast('代碼已複製！', 'success');
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
      navigator.clipboard.writeText(code)
        .then(() => showToast('代碼已複製！', 'success'))
        .catch(() => showToast('複製失敗，請手動選取代碼', 'error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      <style>{`@media print { .no-print { display: none !important; } .print-content { display: block !important; width: 100%; } body { background: white; } .shadow-md { box-shadow: none !important; } .border { border: 1px solid #ddd !important; } }`}</style>
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen} 
        title={confirmConfig.title} 
        message={confirmConfig.message} 
        onConfirm={handleConfirmAction} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
      
      <ShareModal 
        isOpen={showShareModal} 
        activityId={currentActivity?.id} 
        onClose={() => setShowShareModal(false)}
        onCopy={handleCopyCode}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleJoinActivity}
        isLoading={isLoadingImport}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {showNewModal && <NewActivityModal onClose={() => setShowNewModal(false)} onCreate={handleCreateFromModal} onNotify={showToast} />}
      
      <header className="bg-white shadow-sm border-b sticky top-0 z-10 no-print"><div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center"><div className="flex items-center gap-2 text-blue-900 font-black text-xl cursor-pointer" onClick={() => setViewMode('dashboard')}><Bus /> 班級活動規劃儀表板 <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">CLASSROOM V4</span></div><div className="text-sm text-gray-500 flex items-center gap-2">{user ? <span className="text-green-600 flex items-center gap-1"><Cloud size={14}/> 雲端連線中</span> : <span className="text-gray-400">離線模式</span>}<span className="mx-2">|</span>{viewMode === 'editor' ? '編輯模式' : '任務列表'}</div></div></header>
      <main className="mt-6">{viewMode === 'dashboard' ? (<DashboardView activities={allActivities} onCreate={() => setShowNewModal(true)} onEdit={handleEdit} onDelete={handleDelete} onImport={handleImport} onExportAll={handleExportAll} onOpenImport={() => setShowImportModal(true)} onDuplicate={handleDuplicate} />) : (<EditorView activity={currentActivity} onChange={handleChange} onUpdate={handleUpdateActivity} onSave={handleSaveCurrent} onBack={() => {handleSaveCurrent(); setViewMode('dashboard');}} activeTab={activeTab} setActiveTab={setActiveTab} onDelete={handleDelete} onNotify={showToast} onShowShare={() => setShowShareModal(true)} onDuplicate={handleDuplicate} />)}</main>
    </div>
  );
};

export default App;
