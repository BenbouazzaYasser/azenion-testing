"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitInstructorVerification } from "@/actions/instructor-verification.actions";

export default function InstructorVerificationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    expertise_areas: [] as string[],
    teaching_experience: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await submitInstructorVerification({
      full_name: formData.full_name,
      bio: formData.bio,
      expertise_areas: formData.expertise_areas,
      teaching_experience: formData.teaching_experience || null,
      portfolio_url: formData.portfolio_url || null,
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
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
        <h2 className="mb-4 text-xl font-semibold text-ink-50">Basic Information</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-ink-200">
              Full Name *
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
              Bio *
            </label>
            <textarea
              id="bio"
              required
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself and your teaching philosophy..."
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink-200">
              Expertise Areas *
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
                Add
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
              Teaching Experience
            </label>
            <textarea
              id="teaching_experience"
              rows={3}
              value={formData.teaching_experience}
              onChange={(e) => setFormData({ ...formData, teaching_experience: e.target.value })}
              placeholder="Describe your teaching background..."
              className="w-full rounded-lg border border-ink-700 bg-void-800 px-4 py-2 text-ink-50 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-ink-800 bg-void-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-ink-50">Links (Optional)</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="portfolio_url" className="mb-2 block text-sm font-medium text-ink-200">
              Portfolio URL
            </label>
            <input
              id="portfolio_url"
              type="url"
              value={formData.portfolio_url}
              onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
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
        {loading ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}
