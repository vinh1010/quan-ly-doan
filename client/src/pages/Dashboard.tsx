import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { fetchMySecretary, fetchSecretaries } from "../api/secretaries";
import { fetchDocuments } from "../api/documents";
import { fetchEvaluations, fetchMyEvaluations } from "../api/evaluations";
import { fetchAccounts, fetchAuditLogs } from "../api/system";
import { ACTION_LABEL, POSITION_LABEL, STATUS_LABEL, formatDate, formatDateTime } from "../lib/constants";
import Avatar from "../components/Avatar";

const YEAR = new Date().getFullYear();
const MS_DAY = 86_400_000;
const daysFromNow = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / MS_DAY);

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-600">{title}</h2>
      {children}
    </div>
  );
}

function StatTile({ label, value, to, loading }: { label: string; value: number | undefined; to: string; loading: boolean }) {
  return (
    <Link to={to} className="rounded border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#1e88e5] hover:shadow">
      <div className="text-3xl font-light text-[#08326b]">{loading ? "…" : (value ?? 0)}</div>
      <div className="mt-1 text-xs uppercase text-slate-500">{label}</div>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
}

/* ---------- Bí thư (SECRETARY): hồ sơ rút gọn + tình trạng đánh giá năm nay ---------- */
function SecretaryDashboard() {
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ["dash-my-secretary"], queryFn: fetchMySecretary });
  const myEvals = useQuery({ queryKey: ["dash-my-evaluations", YEAR], queryFn: () => fetchMyEvaluations(YEAR) });

  const s = profile.data;
  const latestEval = myEvals.data?.[0];

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-light text-slate-800">Trang chủ</h1>
        <p className="mt-1 text-slate-600">
          Xin chào <b>{user?.fullName ?? user?.username}</b>
          {user?.unit && <> — {user.unit.name}</>}.
        </p>
      </div>

      <Card title="Hồ sơ của tôi">
        {profile.isLoading ? (
          <Empty text="Đang tải..." />
        ) : !s ? (
          <Empty text="Không tìm thấy hồ sơ. Liên hệ cán bộ Đoàn cấp trên." />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={s.avatarUrl} name={s.fullName} size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-bold uppercase text-slate-800">{s.fullName}</p>
              <p className="text-sm text-slate-600">
                {POSITION_LABEL[s.position]} — {s.unit.name}
              </p>
              <p className="text-sm text-slate-500">
                Trạng thái: {STATUS_LABEL[s.status]}
                {s.termEnd && s.status === "ACTIVE" && (
                  <> · Nhiệm kỳ đến {formatDate(s.termEnd)} (còn {daysFromNow(s.termEnd)} ngày)</>
                )}
              </p>
            </div>
            <Link to="/me" className="shrink-0 rounded-sm bg-[#3d7ebf] px-4 py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              Xem đầy đủ
            </Link>
          </div>
        )}
      </Card>

      <Card title={`Đánh giá, xếp loại năm ${YEAR}`}>
        {myEvals.isLoading ? (
          <Empty text="Đang tải..." />
        ) : !latestEval ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-700">Bạn chưa nhập đánh giá, xếp loại Đoàn viên năm {YEAR}.</p>
            <Link to="/evaluations" className="shrink-0 rounded-sm bg-[#2196f3] px-4 py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              + Nhập ngay
            </Link>
          </div>
        ) : latestEval.unit.id === user?.unit?.id ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Đã chấm điểm {latestEval._count?.grades ?? 0} Đoàn viên —{" "}
              <span className="text-amber-700">chưa chuyển lên Bí thư Đoàn xã.</span>
            </p>
            <Link to="/evaluations" className="shrink-0 rounded-sm bg-[#8e44ad] px-4 py-2 text-xs font-bold uppercase text-white hover:opacity-90">
              Chuyển lên
            </Link>
          </div>
        ) : (
          <p className="text-sm text-green-700">✓ Đã chuyển lên {latestEval.unit.name}.</p>
        )}
      </Card>
    </div>
  );
}

/* ---------- Cán bộ cấp trên (SUPERIOR/ADMIN): số liệu tổng quan + việc cần chú ý ---------- */
function StaffDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const activeSecretaries = useQuery({
    queryKey: ["dash-secretaries-active"],
    queryFn: () => fetchSecretaries({ status: "ACTIVE", page: 1, pageSize: 1 }),
  });
  const accountsTotal = useQuery({ queryKey: ["dash-accounts"], queryFn: () => fetchAccounts({ page: 1, pageSize: 1 }) });
  const accountsLocked = useQuery({
    queryKey: ["dash-accounts-locked"],
    queryFn: () => fetchAccounts({ status: "LOCKED", page: 1, pageSize: 1 }),
  });
  const docsPending = useQuery({
    queryKey: ["dash-docs-pending"],
    queryFn: () => fetchDocuments({ status: "CHUA_XU_LY", page: 1, pageSize: 1 }),
  });
  const docsAttention = useQuery({
    queryKey: ["dash-docs-attention"],
    queryFn: () => fetchDocuments({ page: 1, pageSize: 50 }),
  });
  const evalsThisYear = useQuery({
    queryKey: ["dash-evals-year"],
    queryFn: () => fetchEvaluations({ year: String(YEAR), page: 1, pageSize: 1 }),
  });
  const recentActivity = useQuery({
    queryKey: ["dash-activity"],
    queryFn: () => fetchAuditLogs({ page: 1, pageSize: 8 }),
  });
  const secretariesTermData = useQuery({
    queryKey: ["dash-secretaries-term"],
    queryFn: () => fetchSecretaries({ status: "ACTIVE", page: 1, pageSize: 100 }),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attentionDocs = (docsAttention.data?.items ?? []).filter((d) => d.status !== "DA_XU_LY");
  const overdueDocs = attentionDocs
    .filter((d) => d.deadline && new Date(d.deadline) < today)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  const otherPendingDocs = attentionDocs.filter((d) => !(d.deadline && new Date(d.deadline) < today)).slice(0, 6 - overdueDocs.length);
  const attentionList = [...overdueDocs, ...otherPendingDocs].slice(0, 6);

  const termSoon = (secretariesTermData.data?.items ?? [])
    .filter((s) => s.termEnd && daysFromNow(s.termEnd) >= 0 && daysFromNow(s.termEnd) <= 90)
    .sort((a, b) => (a.termEnd ?? "").localeCompare(b.termEnd ?? ""))
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-light text-slate-800">Trang chủ</h1>
        <p className="mt-1 text-slate-600">
          Xin chào <b>{user?.fullName ?? user?.username}</b>
          {user?.unit && <> — {user.unit.name}</>}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Bí thư đang hoạt động" value={activeSecretaries.data?.total} to="/secretaries" loading={activeSecretaries.isLoading} />
        <StatTile label="Tài khoản Bí thư" value={accountsTotal.data?.total} to="/accounts" loading={accountsTotal.isLoading} />
        <StatTile label="Công văn chưa xử lý" value={docsPending.data?.total} to="/documents" loading={docsPending.isLoading} />
        <StatTile label={`Đánh giá năm ${YEAR}`} value={evalsThisYear.data?.total} to="/evaluations" loading={evalsThisYear.isLoading} />
      </div>
      {!accountsLocked.isLoading && !!accountsLocked.data?.total && (
        <p className="-mt-2 text-xs text-slate-500">Trong đó {accountsLocked.data.total} tài khoản đang tạm khóa.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Công văn cần chú ý" className="min-w-0">
          {docsAttention.isLoading ? (
            <Empty text="Đang tải..." />
          ) : attentionList.length === 0 ? (
            <Empty text="Không có công văn nào cần xử lý. 🎉" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {attentionList.map((d) => {
                const overdue = !!d.deadline && new Date(d.deadline) < today;
                return (
                  <li key={d.id} className="py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-800">{d.number}</span>
                      {d.deadline && (
                        <span className={overdue ? "shrink-0 text-xs font-medium text-red-600" : "shrink-0 text-xs text-slate-500"}>
                          {overdue ? "Quá hạn " : "Hạn "}
                          {formatDate(d.deadline)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-slate-500">{d.summary} — {d.unit.name}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/documents" className="mt-3 inline-block text-xs font-bold uppercase text-[#1e88e5] hover:underline">
            Xem tất cả công văn →
          </Link>
        </Card>

        <Card title={isAdmin ? "Hoạt động gần đây" : "Hoạt động của tôi gần đây"} className="min-w-0">
          {recentActivity.isLoading ? (
            <Empty text="Đang tải..." />
          ) : (recentActivity.data?.items.length ?? 0) === 0 ? (
            <Empty text="Chưa có hoạt động nào." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivity.data!.items.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">{ACTION_LABEL[l.action] ?? l.action}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDateTime(l.createdAt)}</span>
                  </div>
                  <p className="text-slate-500">
                    {isAdmin && `${l.user.fullName ?? l.user.username} — `}
                    {l.target}
                    {l.targetId ? ` #${l.targetId}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/audit-logs" className="mt-3 inline-block text-xs font-bold uppercase text-[#1e88e5] hover:underline">
            Xem toàn bộ nhật ký →
          </Link>
        </Card>
      </div>

      <Card title="Nhiệm kỳ sắp hết (trong 90 ngày tới)">
        {secretariesTermData.isLoading ? (
          <Empty text="Đang tải..." />
        ) : termSoon.length === 0 ? (
          <Empty text="Không có Bí thư nào sắp hết nhiệm kỳ." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {termSoon.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-slate-800">{s.fullName}</span>
                  <span className="text-slate-500"> — {s.unit.name}</span>
                </div>
                <span className="shrink-0 text-xs text-amber-700">
                  {formatDate(s.termEnd)} (còn {daysFromNow(s.termEnd!)} ngày)
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/secretaries" className="mt-3 inline-block text-xs font-bold uppercase text-[#1e88e5] hover:underline">
          Xem Ban chấp hành đoàn cơ sở →
        </Link>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "SECRETARY" ? <SecretaryDashboard /> : <StaffDashboard />;
}
