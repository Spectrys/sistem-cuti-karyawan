export function Field({ id, label, name, type = "text", ...props }) {
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input className="input" id={id} name={name} type={type} {...props} />
    </label>
  );
}
