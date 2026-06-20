import { Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const RetryIndicator = ({ retryCount = 0, retryExhausted = false, maxRetries = 10 }) => {
  if (retryCount === 0 && !retryExhausted) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
      retryExhausted ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
    }`}>
      {retryExhausted ? (
        <><ReloadOutlined /> استنفاد المحاولات ({maxRetries}/{maxRetries})</>
      ) : (
        <><Spin size="small" /> محاولة {retryCount}/{maxRetries}</>
      )}
    </div>
  );
};

export default RetryIndicator;
