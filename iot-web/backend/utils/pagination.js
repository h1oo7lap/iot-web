// Tính toán các tham số phân trang
export const getPaginationParams = (query, defaultLimit = 20) => {
    // Ép kiểu về số nguyên cơ số 10 (radix 10) để an toàn hơn
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || defaultLimit, 10)));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

// Định dạng lại cấu trúc JSON trả về cho frontend
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