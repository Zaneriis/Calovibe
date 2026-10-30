REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA calovibe FROM PUBLIC;
CREATE TABLE calovibe.owner (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  issuer text NOT NULL CHECK (length(issuer) > 0),
  subject text NOT NULL CHECK (length(subject) > 0)
);
