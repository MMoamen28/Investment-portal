import { Descriptions, Tag } from 'antd';

const Item = Descriptions.Item;

const Step4Review = ({ values }) => {
  if (!values) return null;
  const { investor = {}, company = {}, investment = {} } = values;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">مراجعة البيانات قبل الإرسال</h3>

      <Descriptions title="البيانات الشخصية" bordered column={1} size="small">
        <Item label="الاسم الكامل">{investor.fullName}</Item>
        <Item label="الرقم القومي"><span dir="ltr">{investor.nationalId}</span></Item>
        <Item label="البريد الإلكتروني"><span dir="ltr">{investor.email}</span></Item>
        <Item label="رقم الهاتف"><span dir="ltr">{investor.phone}</span></Item>
      </Descriptions>

      <Descriptions title="بيانات الشركة" bordered column={1} size="small">
        <Item label="اسم الشركة">{company.name}</Item>
        <Item label="الشكل القانوني">{company.type}</Item>
        <Item label="النشاط التجاري">{company.activity}</Item>
        <Item label="العنوان">{company.address}</Item>
      </Descriptions>

      <Descriptions title="تفاصيل الاستثمار" bordered column={1} size="small">
        <Item label="رأس المال">
          <strong>{Number(investment.amount).toLocaleString('ar-EG')} جنيه مصري</strong>
        </Item>
        <Item label="نوع الاستثمار">{investment.type}</Item>
        <Item label="عدد الشركاء">{investment.partners}</Item>
        <Item label="ملاحظات">{investment.notes || '—'}</Item>
      </Descriptions>

      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
        بالضغط على "إرسال"، تؤكد أن جميع البيانات المقدمة صحيحة وكاملة.
      </div>
    </div>
  );
};

export default Step4Review;
