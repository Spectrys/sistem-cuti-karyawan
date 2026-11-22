export function Alert({ children, role = "alert" }) {
  return (
    <div className="alert" role={role}>
      {children}
    </div>
  );
}
