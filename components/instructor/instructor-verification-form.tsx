"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/components/translation/translation-provider";
import { submitInstructorVerification } from "@/actions/instructor-verification.actions";
import type { EducationEntry, CertificationEntry } from "@/lib/validations/instructor-verification.schema";

const GITHUB_HOSTS = ["github.com", "www.github.com"];
const LINKEDIN_HOSTS = ["linkedin.com", "www.linkedin.com", "linkedin.in", "www.linkedin.in"];
function isValidUrl(str: string) { try { new URL(str); return true; } catch { return false; } }
function getHost(str: string) { try { return new URL(str).hostname.toLowerCase(); } catch { return ""; } }
function digitsOnly(v: string) { return v.replace(/\D/g, "").slice(0, 4); }

const emptyEducation: EducationEntry = {
  institution: "",
  degree: "",
  field: "",
  start_year: "",
  end_year: "",
  self_taught: false,
};

const emptyCertification: CertificationEntry = {
  name: "",
  issuer: "",
  year: "",
  url: "",
};

export default function InstructorVerificationForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    expertise_areas: [] as string[],
    teaching_experience: "",
    education: [] as EducationEntry[],
    certifications: [] as CertificationEntry[],
    portfolio_url: "",
    linkedin_url: "",
    github_url: "",
  });
  const [expertiseInput, setExpertiseInput] = useState("");

  const handleAddExpertise = () => {
    if (expertiseInput.trim() && !formData.expertise_areas.includes(expertiseInput.trim())) {
      setFormData({
        ...formData,
        expertise_areas: [...formData.expertise_areas, expertiseInput.trim()],
      });
      setExpertiseInput("");
    }
  };

  const handleRemoveExpertise = (area: string) => {
    setFormData({
      ...formData,
      expertise_areas: formData.expertise_areas.filter((a) => a !== area),
    });
  };

  const handleAddEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { ...emptyEducation }],
    });
  };

  const handleUpdateEducation = (index: number, field: keyof EducationEntry, value: string | boolean) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value } as EducationEntry;
    setFormData({ ...formData, education: updated });
  };

  const handleRemoveEducation = (index: number) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index),
    });
  };

  const handleAddCertification = () => {
    setFormData({
      ...formData,
      certifications: [...formData.certifications, { ...emptyCertification }],
    });
  };

  const handleUpdateCertification = (index: number, field: keyof CertificationEntry, value: string) => {
    const updated = [...formData.certifications];
    updated[index] = { ...updated[index], [field]: value } as CertificationEntry;
    setFormData({ ...formData, certifications: updated });
  };

  const handleRemoveCertification = (index: number) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.portfolio_url && isValidUrl(formData.portfolio_url)) {
      const ph = getHost(formData.portfolio_url);
      if (GITHUB_HOSTS.includes(ph) || LINKEDIN_HOSTS.includes(ph)) {
        setError(t("settings.urlWarningPortfolio"));
        return;
      }
    }
    if (formData.github_url && isValidUrl(formData.github_url) && !GITHUB_HOSTS.includes(getHost(formData.github_url))) {
      setError(t("settings.urlWarningGithub"));
      return;
    }
    if (formData.linkedin_url && isValidUrl(formData.linkedin_url) && !LINKEDIN_HOSTS.includes(getHost(formData.linkedin_url))) {
      setError(t("settings.urlWarningLinkedin"));
      return;
    }
    setLoading(true);
    setError(null);

    const result = await submitInstructorVerification({
      full_name: formData.full_name,
      bio: formData.bio,
      expertise_areas: formData.expertise_areas,
      teaching_experience: formData.teaching_experience || null,
      education: formData.education.filter((e) => e.self_taught || e.institution.trim()),
      certifications: formData.certifications.filter((c) => c.name.trim()),
      portfolio_url: formData.portfolio_url || null,
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      toast.success(t("settings.instructorSubmitToast"));
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-ink-50">{t("settings.instructorBasicInfo")}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-ink-200">
              {t("settings.instructorFullNameRequired")}
            </label>
            <input
              id="full_name"
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-2 block text-sm font-medium text-ink-200">
              {t("settings.instructorBioRequired")}
            </label>
            <textarea
              id="bio"
              required
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={t("settings.instructorBioPlaceholder")}
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-200">
              {t("settings.instructorExpertiseRequired")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExpertise();
                  }
                }}
                placeholder="e.g., JavaScript, React, System Design"
                className="flex-1 rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddExpertise}
                className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent-500"
              >
                {t("settings.instructorAdd")}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.expertise_areas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveExpertise(area)}
                    className="hover:text-primary/70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="teaching_experience"
              className="mb-2 block text-sm font-medium text-ink-200"
            >
              {t("settings.instructorTeaching")}
            </label>
            <textarea
              id="teaching_experience"
              rows={3}
              value={formData.teaching_experience}
              onChange={(e) => setFormData({ ...formData, teaching_experience: e.target.value })}
              placeholder={t("settings.instructorTeachingPlaceholder")}
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink-50">{t("settings.instructorEducation")}</h2>
          <button
            type="button"
            onClick={handleAddEducation}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-500"
          >
            {t("settings.instructorAddMore")}
          </button>
        </div>

        {formData.education.length === 0 ? (
          <p className="text-sm text-ink-500">{t("settings.instructorNoEducation")}</p>
        ) : (
          <div className="space-y-4">
            {formData.education.map((edu, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-ink-700 bg-void-800/50 p-4"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveEducation(index)}
                  className="absolute right-3 top-3 text-ink-500 hover:text-danger"
                >
                  ×
                </button>

                <div className="mb-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-ink-300">
                    <input
                      type="checkbox"
                      checked={edu.self_taught}
                      onChange={(e) => handleUpdateEducation(index, "self_taught", e.target.checked)}
                      className="rounded border-ink-600 bg-void-800 text-accent focus:ring-accent"
                    />
                    {t("settings.instructorSelfTaught")}
                  </label>
                </div>

                {!edu.self_taught && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-ink-400">
                        {t("settings.instructorInstitutionRequired")}
                      </label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => handleUpdateEducation(index, "institution", e.target.value)}
                        placeholder="e.g., MIT, Stanford University"
                        className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-400">{t("settings.instructorDegree")}</label>
                      <input
                        type="text"
                        value={edu.degree ?? ""}
                        onChange={(e) => handleUpdateEducation(index, "degree", e.target.value)}
                        placeholder="e.g., B.S., M.A., Ph.D."
                        className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-400">
                        {t("settings.instructorFieldStudy")}
                      </label>
                      <input
                        type="text"
                        value={edu.field ?? ""}
                        onChange={(e) => handleUpdateEducation(index, "field", e.target.value)}
                        placeholder="e.g., Computer Science"
                        className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-400">
                        {t("settings.instructorStartYear")}
                      </label>
                      <input
                        type="text"
                        value={edu.start_year ?? ""}
                        onChange={(e) => handleUpdateEducation(index, "start_year", digitsOnly(e.target.value))}
                        placeholder="2020"
                        inputMode="numeric"
                        maxLength={4}
                        className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-400">
                        {t("settings.instructorEndYear")}
                      </label>
                      <input
                        type="text"
                        value={edu.end_year ?? ""}
                        onChange={(e) => handleUpdateEducation(index, "end_year", digitsOnly(e.target.value))}
                        placeholder="2024 or leave blank if current"
                        inputMode="numeric"
                        maxLength={4}
                        className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink-50">{t("settings.instructorCertifications")}</h2>
          <button
            type="button"
            onClick={handleAddCertification}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-500"
          >
            {t("settings.instructorAddMore")}
          </button>
        </div>

        {formData.certifications.length === 0 ? (
          <p className="text-sm text-ink-500">{t("settings.instructorNoCertifications")}</p>
        ) : (
          <div className="space-y-4">
            {formData.certifications.map((cert, index) => (
              <div
                key={index}
                className="relative rounded-lg border border-ink-700 bg-void-800/50 p-4"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveCertification(index)}
                  className="absolute right-3 top-3 text-ink-500 hover:text-danger"
                >
                  ×
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-ink-400">
                      {t("settings.instructorCertificationName")}
                    </label>
                    <input
                      type="text"
                      value={cert.name}
                      onChange={(e) => handleUpdateCertification(index, "name", e.target.value)}
                      placeholder="e.g., AWS Solutions Architect, Google Cloud Professional"
                      className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">
                      {t("settings.instructorIssuingOrg")}
                    </label>
                    <input
                      type="text"
                      value={cert.issuer ?? ""}
                      onChange={(e) => handleUpdateCertification(index, "issuer", e.target.value)}
                      placeholder="e.g., Amazon, Google"
                      className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-400">{t("settings.instructorYear")}</label>
                    <input
                      type="text"
                      value={cert.year ?? ""}
                      onChange={(e) => handleUpdateCertification(index, "year", digitsOnly(e.target.value))}
                      placeholder="2024"
                      inputMode="numeric"
                      maxLength={4}
                      className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-ink-400">
                      {t("settings.instructorCredentialUrl")}
                    </label>
                    <input
                      type="url"
                      value={cert.url ?? ""}
                      onChange={(e) => handleUpdateCertification(index, "url", e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-ink-700 bg-void-800 px-3 py-1.5 text-sm text-ink-50 focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-ink-50">{t("settings.instructorLinks")}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="portfolio_url" className="mb-2 block text-sm font-medium text-ink-200">
              {t("settings.instructorPortfolioUrl")}
            </label>
            <input
              id="portfolio_url"
              type="url"
              value={formData.portfolio_url}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, portfolio_url: val });
                if (val && isValidUrl(val)) {
                  const host = getHost(val);
                  if (GITHUB_HOSTS.includes(host) || LINKEDIN_HOSTS.includes(host)) {
                    setError(t("settings.urlWarningPortfolio"));
                  } else { setError(null); }
                } else { setError(null); }
              }}
              placeholder="https://yourportfolio.com"
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="linkedin_url" className="mb-2 block text-sm font-medium text-ink-200">
              LinkedIn URL
            </label>
            <input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, linkedin_url: val });
                if (val && isValidUrl(val) && !LINKEDIN_HOSTS.includes(getHost(val))) {
                  setError(t("settings.urlWarningLinkedin"));
                } else { setError(null); }
              }}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="github_url" className="mb-2 block text-sm font-medium text-ink-200">
              GitHub URL
            </label>
            <input
              id="github_url"
              type="url"
              value={formData.github_url}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, github_url: val });
                if (val && isValidUrl(val) && !GITHUB_HOSTS.includes(getHost(val))) {
                  setError(t("settings.urlWarningGithub"));
                } else { setError(null); }
              }}
              placeholder="https://github.com/yourusername"
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || formData.expertise_areas.length === 0}
        className="w-full rounded-lg bg-accent px-6 py-3 font-medium text-white hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("settings.instructorSubmitting") : t("settings.instructorSubmitApplication")}
      </button>
    </form>
  );
}
