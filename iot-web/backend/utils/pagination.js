export const getPaginationParams = (query, defaultLimit = 20) => {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || defaultLimit, 10)));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

export const formatPaginationResponse = (page, limit, total, data) => {
    return {
        success: true,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        },
        data
    };
};