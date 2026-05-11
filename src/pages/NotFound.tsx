import React from 'react';
import { Result } from 'antd';
import { SmileOutlined } from '@ant-design/icons';

const NotFound = () => {
  return (
    <Result
      status="404"
      title="الصفحة غير موجودة"
      subTitle="الصفحة التي تبحث عنها لا توجد أو قد تم حذفها."
      extra={<a href="/">العودة إلى الصفحة الرئيسية</a>}
      icon={<SmileOutlined />}
    />
  );
};

export default NotFound;