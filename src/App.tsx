import React, { useState, useEffect } from 'react';
import { ChevronLeft, Menu, User, Info, X, Check } from 'lucide-react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7M4PehYvIg9olRmBWI_MH2efPkk9BgOoHitD3RajLOfihi0bMZV6YLUaA7iBXzGmI/exec';

type SlotData = {
  date: string;
  timeSlot: string;
  isBooked: boolean;
  companyName?: string;
};

export default function App() {
  const [allSlots, setAllSlots] = useState<SlotData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBuyers, setShowBuyers] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    product: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSlotsData();
  }, []);

  const fetchSlotsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=read`);
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("text/html") !== -1) {
        console.error("API 回傳了 HTML，可能是權限未設定為「所有人」");
        alert("⚠️ 無法讀取資料：Google Apps Script 權限設定錯誤，請確保「誰可以存取」設定為「所有人」。");
        setAllSlots([]);
        return;
      }

      const rawText = await response.text();
      
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        alert('API 回傳的資料格式錯誤，請檢查 Console。');
        setAllSlots([]);
        return;
      }

      if (Array.isArray(data)) {
        setAllSlots(data);
        // Set default selected date if available
        const uniqueDates = Array.from(new Set(data.map(s => s.date)));
        if (uniqueDates.length > 0 && !selectedDate) {
          setSelectedDate(uniqueDates[0]);
        }
      } else {
        setAllSlots([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('無法連線至資料庫，請檢查網路或 API 網址。');
      setAllSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotClick = (slot: string, isBooked: boolean) => {
    if (!isBooked) {
      setSelectedSlot(slot);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === '123') {
      setShowBuyers(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert('密碼錯誤！');
      setPasswordInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDate) return;

    setIsSubmitting(true);
    try {
      const payload = {
        action: 'write',
        date: selectedDate,
        timeSlot: selectedSlot,
        ...formData
      };

      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        mode: 'no-cors', // Add no-cors mode to bypass CORS policy for POST
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });

      // Show success modal
      setShowSuccessModal(true);
      
      // Wait 2 seconds, then close modals and refresh data
      setTimeout(() => {
        setShowSuccessModal(false);
        setShowForm(false);
        setFormData({ companyName: '', contactPerson: '', email: '', product: '', notes: '' });
        setSelectedSlot(null);
        fetchSlotsData();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      alert('報名失敗，請檢查網路連線或 API 網址是否正確。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format date like "4/22" to "2026/04/22(三)"
  const formatDateLabel = (dateStr: string) => {
    let fullDateStr = dateStr;
    if (!fullDateStr.includes('2026') && !fullDateStr.includes('2025') && !fullDateStr.includes('2024')) {
      fullDateStr = `2026/${dateStr}`;
    }
    const dateObj = new Date(fullDateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const day = days[dateObj.getDay()];
    return `2026/${m}/${d}(${day})`;
  };

  // Get unique dates for tabs
  const uniqueDates = Array.from(new Set(allSlots.map(s => s.date)));
  
  // Get slots for selected date
  const slotsForSelectedDate = allSlots.filter(s => s.date === selectedDate);
  
  // Separate into morning and afternoon (simple logic based on hour)
  const morningSlots = slotsForSelectedDate.filter(s => {
    const hour = parseInt(s.timeSlot.split(':')[0], 10);
    return hour < 12;
  });
  
  const afternoonSlots = slotsForSelectedDate.filter(s => {
    const hour = parseInt(s.timeSlot.split(':')[0], 10);
    return hour >= 12;
  });

  const availableSlotsCount = allSlots.filter(s => !s.isBooked).length;
  const bookedSlotsList = allSlots.filter(s => s.isBooked);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex justify-center">
      <div className="w-full max-w-md bg-white shadow-xl min-h-screen relative overflow-hidden flex flex-col">
        
        {/* Header */}
        <header className="bg-blue-500 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <ChevronLeft className="w-6 h-6" />
            <span className="font-medium">買主列表</span>
          </div>
          <h1 className="text-lg font-bold">Funtech 報名系統</h1>
          <div className="w-6" /> {/* Spacer for centering */}
        </header>

        {/* Sub Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <Menu className="w-6 h-6 text-gray-600" />
          <div className="font-bold text-xl tracking-wider">
            <span className="text-black">Funtech</span> <span className="text-gray-400 text-sm font-normal">| 採洽易</span>
          </div>
          <User className="w-6 h-6 text-blue-500" />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="p-5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {showBuyers ? '已報名買主' : '報名時段選擇'}
              </h2>
              <button 
                onClick={() => {
                  if (showBuyers) {
                    setShowBuyers(false);
                  } else {
                    setShowPasswordModal(true);
                  }
                }}
                className="text-blue-600 border border-blue-600 rounded-full px-4 py-1.5 text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                {showBuyers ? '返回報名' : '顯示目前報名買主'}
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : showBuyers ? (
              // Booked Buyers View
              <div className="space-y-4 animate-in fade-in duration-300">
                {bookedSlotsList.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-500 text-lg font-medium">目前尚無買主報名</p>
                  </div>
                ) : (
                  bookedSlotsList.map((slot, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-500">{formatDateLabel(slot.date)} {slot.timeSlot}</div>
                        <div className="font-bold text-gray-800 text-lg mt-1">{slot.companyName || '已保留'}</div>
                      </div>
                      <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">
                        已報名
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : allSlots.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg font-medium">目前沒有可預約的時段</p>
                <p className="text-gray-400 text-sm mt-2">請確認 Google Sheet 中是否已填寫日期與時段</p>
              </div>
            ) : (
              // Booking View
              <div className="animate-in fade-in duration-300">
                {/* Date Tabs */}
                <div className="flex border-b border-gray-200 mb-6 relative overflow-x-auto no-scrollbar">
                  {uniqueDates.map(date => (
                    <button
                      key={date}
                      onClick={() => handleDateChange(date)}
                      className={`flex-none px-4 pb-3 text-center font-medium transition-colors whitespace-nowrap ${
                        selectedDate === date ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {formatDateLabel(date)}
                    </button>
                  ))}
                  <div className="absolute right-0 bottom-3 flex items-center text-yellow-500 text-sm font-medium bg-white pl-2">
                    如何報名 <Info className="w-4 h-4 ml-1" />
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Morning Slots */}
                  {morningSlots.length > 0 && (
                    <div>
                      <h3 className="text-gray-500 font-medium mb-3">上午</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {morningSlots.map(slot => {
                          const selected = selectedSlot === slot.timeSlot;
                          return (
                            <button
                              key={slot.timeSlot}
                              disabled={slot.isBooked}
                              onClick={() => handleSlotClick(slot.timeSlot, slot.isBooked)}
                              className={`
                                py-3 px-1 rounded-xl text-sm font-medium transition-all
                                ${slot.isBooked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                  selected ? 'bg-blue-600 text-white shadow-md transform scale-105' : 
                                  'bg-blue-50 text-blue-800 hover:bg-blue-100'}
                              `}
                            >
                              {slot.timeSlot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {afternoonSlots.length > 0 && (
                    <div>
                      <h3 className="text-gray-500 font-medium mb-3">下午</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {afternoonSlots.map(slot => {
                          const selected = selectedSlot === slot.timeSlot;
                          return (
                            <button
                              key={slot.timeSlot}
                              disabled={slot.isBooked}
                              onClick={() => handleSlotClick(slot.timeSlot, slot.isBooked)}
                              className={`
                                py-3 px-1 rounded-xl text-sm font-medium transition-all
                                ${slot.isBooked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                  selected ? 'bg-blue-600 text-white shadow-md transform scale-105' : 
                                  'bg-blue-50 text-blue-800 hover:bg-blue-100'}
                              `}
                            >
                              {slot.timeSlot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar (Only show in booking view) */}
        {!showBuyers && (
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
            <button
              disabled={!selectedSlot}
              onClick={() => setShowForm(true)}
              className={`w-full py-4 rounded-xl text-lg font-bold transition-all shadow-lg
                ${selectedSlot 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
              `}
            >
              填寫報名表
            </button>
            <p className="text-center text-blue-400 text-sm mt-4 font-medium">
              此活動尚可預約 {availableSlotsCount} 次
            </p>
          </div>
        )}

        {/* Registration Form Modal */}
        {showForm && (
          <div className="absolute inset-0 bg-black/50 z-40 flex flex-col justify-end animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl p-6 h-[85%] flex flex-col animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">填寫報名資料</h2>
                  <p className="text-blue-600 font-medium mt-1">
                    {selectedDate ? formatDateLabel(selectedDate) : ''} {selectedSlot}
                  </p>
                </div>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pb-6 pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">廠商名稱 *</label>
                  <input
                    required
                    type="text"
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="請輸入公司名稱"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">聯絡人 *</label>
                  <input
                    required
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="請輸入聯絡人姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">信箱 *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="example@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">想要商品</label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={e => setFormData({...formData, product: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="請輸入感興趣的商品"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                    placeholder="其他需求或備註事項"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl text-lg font-bold text-white transition-all shadow-lg mt-4
                    ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-0.5'}
                  `}
                >
                  {isSubmitting ? '送出中...' : '確認送出'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-[80%] max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">請輸入密碼</h3>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="請輸入密碼"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-center tracking-widest text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                  }}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300 max-w-[80%]">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                <Check className="w-10 h-10 text-green-500 animate-[bounce_1s_ease-in-out]" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">報名成功！</h3>
              <p className="text-gray-500 text-center">您的資料已成功送出<br/>畫面將自動返回首頁</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
