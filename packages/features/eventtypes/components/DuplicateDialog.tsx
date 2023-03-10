import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Form,
  showToast,
  TextAreaField,
  TextField,
} from "@calcom/ui";

const DuplicateDialog = () => {
  const { t } = useLocale();
  const router = useRouter();

  // react hook form
  const form = useForm({
    defaultValues: {
      id: Number(router.query.id as string) || -1,
      title: (router.query.title as string) || "",
      slug: t("event_type_duplicate_copy_text", { slug: router.query.slug as string }),
      description: (router.query.description as string) || "",
      length: Number(router.query.length) || 30,
    },
  });
  const { register } = form;

  const duplicateMutation = trpc.viewer.eventTypes.duplicate.useMutation({
    onSuccess: async ({ eventType }) => {
      await router.replace("/event-types/" + eventType.id);
      showToast(t("event_type_created_successfully", { eventTypeTitle: eventType.title }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR" || err.data?.code === "BAD_REQUEST") {
        const message = t("unexpected_error_try_again");
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED" || err.data?.code === "FORBIDDEN") {
        const message = `${err.data.code}: You are not able to create this event`;
        showToast(message, "error");
      }
    },
  });

  const { pageSlug } = router.query;

  return (
    <Dialog
      name="duplicate-event-type"
      clearQueryParamsOnClose={["description", "title", "length", "slug", "name", "id"]}>
      <DialogContent type="creation" className="overflow-y-auto" title="Duplicate Event Type">
        <Form
          form={form}
          handleSubmit={(values) => {
            duplicateMutation.mutate(values);
          }}>
          <div className="mt-3 space-y-6">
            <TextField
              label={t("title")}
              placeholder={t("quick_chat")}
              {...register("title")}
              onChange={(e) => {
                form.setValue("title", e?.target.value);
                if (form.formState.touchedFields["slug"] === undefined) {
                  form.setValue("slug", slugify(e?.target.value));
                }
              }}
            />

            {process.env.NEXT_PUBLIC_WEBSITE_URL !== undefined &&
            process.env.NEXT_PUBLIC_WEBSITE_URL?.length >= 21 ? (
              <TextField
                label={`${t("url")}: ${process.env.NEXT_PUBLIC_WEBSITE_URL}`}
                required
                addOnLeading={<>/{pageSlug}/</>}
                {...register("slug")}
                onChange={(e) => {
                  form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
                }}
              />
            ) : (
              <TextField
                label={t("url")}
                required
                addOnLeading={
                  <>
                    {process.env.NEXT_PUBLIC_WEBSITE_URL}/{pageSlug}/
                  </>
                }
                {...register("slug")}
              />
            )}

            <TextAreaField
              label={t("description")}
              placeholder={t("quick_video_meeting")}
              {...register("description")}
            />

            <div className="relative">
              <TextField
                type="number"
                required
                min="10"
                placeholder="15"
                label={t("length")}
                className="pr-20"
                {...register("length", { valueAsNumber: true })}
                addOnSuffix={t("minutes")}
              />
            </div>
          </div>
          <div className="mt-8 flex flex-row-reverse gap-x-2">
            <Button type="submit" loading={duplicateMutation.isLoading}>
              {t("continue")}
            </Button>
            <DialogClose />
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { DuplicateDialog };
