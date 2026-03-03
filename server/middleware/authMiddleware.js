export const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (req.session && req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
        }
    };
};

export const attachUser = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
};
