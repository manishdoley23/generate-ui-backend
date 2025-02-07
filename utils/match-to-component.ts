interface Intent {
  action: string;
  entity: string;
  constraints: string;
}

export function matchToComponent(intent: Intent) {
  console.log("intent in matchToComponent:", intent);
  /* */
  return {
    id: "button",
    type: "form",
    fields: ["name", "email"],
  };
}
