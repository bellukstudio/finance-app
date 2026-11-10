import Link from "next/link";
import { Icon } from "@/components/icons";

export default function Page() {
    return (
        <div className="auth-wrap">
            <section className="card invite-card" role="alert">
                <div className="invite-hero">
                    <div className="invite-ico bad"><Icon n="alert" /></div>
                </div>
                <h1>Undangan tidak bisa dipakai</h1>
                <p className="invite-lead">
                    Link ini tidak valid, sudah kedaluwarsa, atau sudah dipakai. Minta Owner/Admin keluarga membuat link undangan baru.
                </p>
                <Link href="/dashboard" className="btn auth-btn">Ke dashboard</Link>
            </section>
        </div>
    );
}