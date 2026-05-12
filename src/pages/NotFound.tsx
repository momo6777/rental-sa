import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <span className="material-symbols-outlined text-7xl text-outline-variant mb-6 block">error_outline</span>
        <h1 className="font-headline-xl text-headline-xl text-primary mb-3">الصفحة غير موجودة</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          الصفحة التي تبحث عنها لا توجد أو قد تم حذفها.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-md inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          العودة إلى الصفحة الرئيسية
        </button>
      </div>
    </div>
  );
};

export default NotFound;
