/**
 * VV.Form.Global.GIS_BuildFormElementsForLayer
 * Parameters: 1
 * Extracted from WADNR (vv5dev/fpOnline) on 2026-04-08
 */
function (layer) {
/*Function Name:   GIS_BuildFormElementsForLayer
  Customer:       WA FNR: fpOnline
  Purpose:        Creates a layer for the editor widget that hides
                  the fields that a proponent doesn't need to see
  Date of Dev:   05/28/2025
  Last Rev Date: 05/28/2025

  Parameters: layer (Object) AGOL layer of the webmap

  05/20/2025 - Ross Rhone: First setup of script.
  09/17/2025 - Ross Rhone: Added in crossing id required field for stream crossing
*/

function removeEnvironment(title = "") {
  return title
    .trim()
    .replace(/[\s_-]+(sbox|prod)\s*$/i, "")
    .replace(/\s+/g, " ");
}

switch (removeEnvironment(layer.title)) {

    case "Unit Boundary":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "unit_id" ? "true" : "false"
        }));

    case "Roads/Utilities":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "activity_type" ? "true" : "false"
        }));

    case "Buffers":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "activity_type" ? "true" : "false"
        }));

    case "Other Points":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "activity_type" ? "true" : "false"
        }));

    case "Water Crossing Points":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "crossing_id" ? "true" : "false"
        }));


    case "WTM Survey Points":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "activity_type" ? "true" : "false"
        }));

    case "Water Bodies":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "activity_type" ? "true" : "false"
        }));

    case "Streams":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "activity_type" ? "true" : "false"
        }));

    case "Text":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "text_to_display" ? "true" : "false"
        }));

    case "Arrow":
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: field.name === "text_to_display" ? "true" : "false"
        }));

    default:
        // Hide all fields for unspecified layers
        return layer.fields.map(field => ({
            type: "field",
            fieldName: field.name,
            label: field.alias || field.name,
            visibilityExpression: "false"
        }));
}

}
