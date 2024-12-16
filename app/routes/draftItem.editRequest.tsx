import { data, type ActionFunctionArgs } from "react-router";
import { checkAuth } from "~/services/auth.server";
import {
  completeProductDraftItem,
  requestProductEdit,
} from "~/services/product.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await checkAuth(request);
  if (!user)
    return Response.json(
      data({ success: false, message: "Authentication Failure" }),
      { status: 401 }
    );

  const formData = await request.formData();
  const draftItemId = Number(formData.get("draftItemId"));
  const upc = formData.get("upc")?.toString();
  const editNotes = formData.get("editNotes")?.toString();
  if (isNaN(draftItemId) || !editNotes || !upc) {
    return Response.json(
      data({
        success: false,
        message: "We need more details to request this edit.",
      }),
      { status: 400 }
    );
  }

  const createdEditRequest = await requestProductEdit(
    upc,
    editNotes,
    "receipt-mismatch"
  );
  completeProductDraftItem(draftItemId);

  return Response.json(
    data({
      success: true,
      message:
        "Your edit is noted and will be reviewed, thank you for contributing!",
      result: { ...createdEditRequest },
    }),
    { status: 200 }
  );
}
