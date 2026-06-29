import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Flag } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchReports, resolveReport } from "../services/admin.js";

export default function AdminReports() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports()
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const refreshReports = async () => {
    const data = await fetchReports();
    setReports(Array.isArray(data) ? data : []);
  };

  const handleResolve = async (reportId) => {
    try {
      await resolveReport(reportId, "resolved");
      await refreshReports();
      toast.success(lang === "ar" ? "تم حل التقرير" : "Report resolved");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <p>{lang === "ar" ? "جار تحميل التقارير..." : "Loading reports..."}</p>
      </div>
    );
  }

  return (
    <section className="panel admin-dashboard">
      <div className="panel-title"><Flag size={18} /><h2>{lang === "ar" ? "صفحة التقارير" : "Reports"}</h2></div>
      {reports.length === 0 ? (
        <div className="panel"><p>{lang === "ar" ? "لا توجد تقارير حاليا." : "No reports found."}</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{lang === "ar" ? "المعرف" : "ID"}</th>
                <th>{lang === "ar" ? "المستخدم" : "User"}</th>
                <th>{lang === "ar" ? "النوع" : "Type"}</th>
                <th>{lang === "ar" ? "الرسالة" : "Message"}</th>
                <th>{lang === "ar" ? "الحالة" : "Status"}</th>
                <th>{lang === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td data-label={lang === "ar" ? "المعرف" : "ID"}>{report.id}</td>
                  <td data-label={lang === "ar" ? "المستخدم" : "User"}>{report.username || report.user || report.reportedUser || "-"}</td>
                  <td data-label={lang === "ar" ? "النوع" : "Type"}>{report.type || report.category || "-"}</td>
                  <td data-label={lang === "ar" ? "الرسالة" : "Message"}>{report.message}</td>
                  <td data-label={lang === "ar" ? "الحالة" : "Status"}>{report.status}</td>
                  <td data-label={lang === "ar" ? "إجراءات" : "Actions"}>
                    <button className="primary" type="button" onClick={() => handleResolve(report.id)}>
                      {lang === "ar" ? "حل" : "Resolve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
